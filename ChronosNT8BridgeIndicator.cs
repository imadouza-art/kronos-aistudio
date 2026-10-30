#region Using declarations
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Media;
using System.Xml.Serialization;
using NinjaTrader.Cbi;
using NinjaTrader.Core.FloatingPoint;
using NinjaTrader.Data;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.DrawingTools;
#endregion

//+-----------------------------------------------------------------------------------------+
//| Chronos & Financial Kronos 100M AI Foundation Model - NinjaTrader 8 (NT8) Bridge        |
//| Real-time market data streaming and probabilistic quantile forecasting for CME Futures   |
//| Compatible with Tradovate, NinjaTrader Brokerage, and Interactive Brokers feeds         |
//+-----------------------------------------------------------------------------------------+

namespace NinjaTrader.NinjaScript.Indicators
{
    public class ChronosNT8BridgeIndicator : Indicator
    {
        #region Private Fields
        private static readonly HttpClient httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(3.0) };
        private string instrumentRoot = "ES";
        private string timeframeStr = "1m";
        private int lastProcessedBar = -1;
        private double lastSpotPrice = 0.0;
        private double forecastP10 = 0.0;
        private double forecastP50 = 0.0;
        private double forecastP90 = 0.0;
        private string forecastAction = "FLAT";
        private double forecastSL = 0.0;
        private double forecastTP = 0.0;
        private double forecastConfidence = 0.0;
        private double forecastDriftPct = 0.0;
        private string lastStatusMessage = "Initializing...";
        private bool isBridgeConnected = false;
        private long lastTransmissionUtcMs = 0;
        private int roundtripLatencyMs = 0;
        private readonly object syncLock = new object();
        #endregion

        #region Properties & Settings
        [NinjaScriptProperty]
        [Display(Name = "Bridge Server URL", Description = "Local Python NT8 Bridge URL", Order = 1, GroupName = "1. Connection Settings")]
        public string BridgeUrl { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Prediction Horizon (Bars)", Description = "Number of future bars to forecast", Order = 2, GroupName = "2. Model Parameters")]
        public int PredictionHorizon { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Model Variant", Description = "Foundation model variant", Order = 3, GroupName = "2. Model Parameters")]
        public string ModelVariant { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Historical Context Bars", Description = "Number of recent historical bars to prime the context window", Order = 4, GroupName = "2. Model Parameters")]
        public int HistoricalBars { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Draw Forecast Lines", Description = "Draw p10, p50, and p90 horizontal forecast targets on chart", Order = 5, GroupName = "3. Visual Display")]
        public bool DrawForecastLines { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show On-Chart HUD", Description = "Display AI forecast dashboard HUD in the chart corner", Order = 6, GroupName = "3. Visual Display")]
        public bool ShowHUD { get; set; }

        [XmlIgnore]
        [Display(Name = "P90 (Bull Target) Color", Order = 7, GroupName = "3. Visual Display")]
        public Brush P90Color { get; set; }

        [Browsable(false)]
        public string P90ColorSerializable
        {
            get { return Serialize.BrushToString(P90Color); }
            set { P90Color = Serialize.StringToBrush(value); }
        }

        [XmlIgnore]
        [Display(Name = "P50 (Median) Color", Order = 8, GroupName = "3. Visual Display")]
        public Brush P50Color { get; set; }

        [Browsable(false)]
        public string P50ColorSerializable
        {
            get { return Serialize.BrushToString(P50Color); }
            set { P50Color = Serialize.StringToBrush(value); }
        }

        [XmlIgnore]
        [Display(Name = "P10 (Bear Target) Color", Order = 9, GroupName = "3. Visual Display")]
        public Brush P10Color { get; set; }

        [Browsable(false)]
        public string P10ColorSerializable
        {
            get { return Serialize.BrushToString(P10Color); }
            set { P10Color = Serialize.StringToBrush(value); }
        }
        #endregion

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = "Chronos AI 100M Real-Time Predictor & Financial Kronos NT8 Tradovate Data Bridge.";
                Name = "ChronosNT8Bridge";
                Calculate = Calculate.OnPriceChange; // Detects forming ticks and bar completion
                IsOverlay = true;
                DisplayInDataBox = true;
                DrawOnPricePanel = true;
                PaintPriceMarkers = true;
                IsSuspendedWhileInactive = false;

                // Defaults
                BridgeUrl = "http://localhost:5000/api/nt8/bar";
                PredictionHorizon = 24;
                ModelVariant = "kronos-financial-100m";
                HistoricalBars = 80;
                DrawForecastLines = true;
                ShowHUD = true;

                P90Color = Brushes.LimeGreen;
                P50Color = Brushes.Gold;
                P10Color = Brushes.Crimson;
            }
            else if (State == State.Configure)
            {
                // Determine clean instrument root (e.g. ES, MES, NQ, MNQ)
                if (Instrument != null)
                {
                    string fullName = Instrument.FullName ?? Instrument.MasterInstrument.Name;
                    string masterName = Instrument.MasterInstrument != null ? Instrument.MasterInstrument.Name.ToUpper() : "";

                    if (masterName.Contains("MES") || fullName.StartsWith("MES"))
                        instrumentRoot = "MES";
                    else if (masterName.Contains("MNQ") || fullName.StartsWith("MNQ"))
                        instrumentRoot = "MNQ";
                    else if (masterName.Contains("ES") || fullName.StartsWith("ES"))
                        instrumentRoot = "ES";
                    else if (masterName.Contains("NQ") || fullName.StartsWith("NQ"))
                        instrumentRoot = "NQ";
                    else if (masterName.Contains("GC") || fullName.StartsWith("GC"))
                        instrumentRoot = "GC";
                    else if (masterName.Contains("SI") || fullName.StartsWith("SI"))
                        instrumentRoot = "SI";
                    else
                        instrumentRoot = !string.IsNullOrEmpty(masterName) ? masterName : fullName;
                }

                // Determine timeframe string
                if (BarsPeriod != null)
                {
                    if (BarsPeriod.BarsPeriodType == BarsPeriodType.Minute)
                    {
                        if (BarsPeriod.Value == 1) timeframeStr = "1m";
                        else if (BarsPeriod.Value == 5) timeframeStr = "5m";
                        else if (BarsPeriod.Value == 15) timeframeStr = "15m";
                        else if (BarsPeriod.Value == 30) timeframeStr = "30m";
                        else if (BarsPeriod.Value == 60) timeframeStr = "1h";
                        else timeframeStr = BarsPeriod.Value + "m";
                    }
                    else if (BarsPeriod.BarsPeriodType == BarsPeriodType.Day)
                    {
                        timeframeStr = "1d";
                    }
                    else
                    {
                        timeframeStr = BarsPeriod.Value + "m";
                    }
                }
            }
            else if (State == State.DataLoaded)
            {
                Print(string.Format("[ChronosNT8] Initialized for {0} ({1}). Bridge Target: {2}", instrumentRoot, timeframeStr, BridgeUrl));
                // Prime the model with historical bars as soon as historical data finishes loading
                SendHistoricalBatch();
            }
            else if (State == State.Terminated)
            {
                RemoveDrawingObjects();
            }
        }

        protected override void OnBarUpdate()
        {
            if (CurrentBar < 5) return;

            // Update forming spot price on each tick
            lastSpotPrice = Close[0];

            // When a bar completes (or on first tick of a new bar), transmit the completed bar
            if (IsFirstTickOfBar && CurrentBar > lastProcessedBar)
            {
                lastProcessedBar = CurrentBar;
                int barIndex = 1; // Completed bar is index 1

                DateTime barTimeUtc = Time[barIndex].ToUniversalTime();
                long barUtcMs = (long)(barTimeUtc.Subtract(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc))).TotalMilliseconds;

                double barOpen = Open[barIndex];
                double barHigh = High[barIndex];
                double barLow = Low[barIndex];
                double barClose = Close[barIndex];
                double barVol = Volume[barIndex];

                // Gather recent historical context bars
                List<object> candlesList = new List<object>();
                int barsToSend = Math.Min(HistoricalBars, CurrentBar);

                for (int i = barsToSend; i >= 1; i--)
                {
                    DateTime cUtc = Time[i].ToUniversalTime();
                    long cMs = (long)(cUtc.Subtract(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc))).TotalMilliseconds;
                    candlesList.Add(new
                    {
                        time = cMs,
                        open = Open[i],
                        high = High[i],
                        low = Low[i],
                        close = Close[i],
                        volume = Volume[i]
                    });
                }

                // Asynchronously transmit bar payload to local Python bridge (non-blocking)
                Task.Run(() => TransmitBarAsync(barUtcMs, barOpen, barHigh, barLow, barClose, barVol, candlesList));
            }

            // Update chart HUD on real-time price updates
            if (State == State.Realtime && ShowHUD)
            {
                UpdateOnChartHUD();
            }
        }

        #region Asynchronous Transmission & Network I/O
        private async Task TransmitBarAsync(long barUtcMs, double o, double h, double l, double c, double v, List<object> historyCandles)
        {
            try
            {
                var payloadObj = new
                {
                    source = "NinjaTrader 8 (Tradovate)",
                    symbol = instrumentRoot,
                    contract = Instrument != null ? Instrument.FullName : instrumentRoot,
                    timeframe = timeframeStr,
                    horizon = PredictionHorizon,
                    variant = ModelVariant,
                    is_bar_closed = true,
                    bar = new
                    {
                        time = barUtcMs,
                        open = o,
                        high = h,
                        low = l,
                        close = c,
                        volume = v
                    },
                    candles = historyCandles
                };

                string jsonPayload = SimpleJsonSerializer(payloadObj);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                DateTime reqStart = DateTime.UtcNow;
                HttpResponseMessage response = await httpClient.PostAsync(BridgeUrl, content).ConfigureAwait(false);
                int latency = (int)(DateTime.UtcNow - reqStart).TotalMilliseconds;

                if (response.IsSuccessStatusCode)
                {
                    string resBody = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    ParseForecastResponse(resBody, c, latency);
                    lock (syncLock)
                    {
                        isBridgeConnected = true;
                        lastTransmissionUtcMs = (long)(DateTime.UtcNow.Subtract(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc))).TotalMilliseconds;
                        roundtripLatencyMs = latency;
                        lastStatusMessage = string.Format("Live NT8 Stream ({0}ms)", latency);
                    }

                    // Trigger UI chart update
                    if (ChartControl != null && ChartControl.Dispatcher != null)
                    {
                        ChartControl.Dispatcher.InvokeAsync(() =>
                        {
                            if (DrawForecastLines) UpdateForecastLines();
                            if (ShowHUD) UpdateOnChartHUD();
                        });
                    }
                }
                else
                {
                    lock (syncLock)
                    {
                        isBridgeConnected = false;
                        lastStatusMessage = string.Format("Bridge HTTP Error {0}", (int)response.StatusCode);
                    }
                }
            }
            catch (Exception ex)
            {
                lock (syncLock)
                {
                    isBridgeConnected = false;
                    lastStatusMessage = "Bridge Connection Error";
                }
                Print(string.Format("[ChronosNT8 Error] Failed to transmit bar: {0}", ex.Message));
            }
        }

        private void SendHistoricalBatch()
        {
            if (CurrentBar < 5) return;

            Task.Run(async () =>
            {
                try
                {
                    int barsToSend = Math.Min(HistoricalBars, CurrentBar);
                    List<object> candlesList = new List<object>();

                    for (int i = barsToSend; i >= 0; i--)
                    {
                        DateTime cUtc = Time[i].ToUniversalTime();
                        long cMs = (long)(cUtc.Subtract(new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc))).TotalMilliseconds;
                        candlesList.Add(new
                        {
                            time = cMs,
                            open = Open[i],
                            high = High[i],
                            low = Low[i],
                            close = Close[i],
                            volume = Volume[i]
                        });
                    }

                    var payload = new
                    {
                        source = "NinjaTrader 8 (Tradovate)",
                        symbol = instrumentRoot,
                        contract = Instrument != null ? Instrument.FullName : instrumentRoot,
                        timeframe = timeframeStr,
                        horizon = PredictionHorizon,
                        variant = ModelVariant,
                        is_initial_history = true,
                        candles = candlesList
                    };

                    string json = SimpleJsonSerializer(payload);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");
                    await httpClient.PostAsync(BridgeUrl, content).ConfigureAwait(false);
                }
                catch
                {
                    // Silent fail on historical boot; will retry on first live bar
                }
            });
        }
        #endregion

        #region Response Parsing & JSON Helpers
        private void ParseForecastResponse(string json, double currentClose, int latency)
        {
            try
            {
                // Extract forecasts and signals using resilient string scanning
                double p10Val = ExtractNumericField(json, "\"p10\":");
                double p50Val = ExtractNumericField(json, "\"p50\":");
                double p90Val = ExtractNumericField(json, "\"p90\":");

                if (p50Val > 0)
                {
                    lock (syncLock)
                    {
                        forecastP10 = p10Val;
                        forecastP50 = p50Val;
                        forecastP90 = p90Val;
                        forecastDriftPct = currentClose > 0 ? ((p50Val - currentClose) / currentClose) * 100.0 : 0.0;

                        // Signal parsing
                        if (json.Contains("\"action\":\"LONG\"")) forecastAction = "LONG";
                        else if (json.Contains("\"action\":\"SHORT\"")) forecastAction = "SHORT";
                        else if (json.Contains("\"action\":\"FLAT\"")) forecastAction = "FLAT";

                        forecastSL = ExtractNumericField(json, "\"sl\":");
                        forecastTP = ExtractNumericField(json, "\"tp\":");
                        forecastConfidence = ExtractNumericField(json, "\"confidence\":");
                        if (forecastConfidence <= 0) forecastConfidence = 68.0;
                    }
                }
            }
            catch (Exception ex)
            {
                Print("[ChronosNT8 Parse Error] " + ex.Message);
            }
        }

        private double ExtractNumericField(string json, string fieldKey)
        {
            int idx = json.IndexOf(fieldKey, StringComparison.OrdinalIgnoreCase);
            if (idx == -1) return 0.0;
            int start = idx + fieldKey.Length;
            while (start < json.Length && (json[start] == ' ' || json[start] == ':')) start++;
            int end = start;
            while (end < json.Length && (char.IsDigit(json[end]) || json[end] == '.' || json[end] == '-')) end++;
            if (end > start)
            {
                double val;
                if (double.TryParse(json.Substring(start, end - start), NumberStyles.Any, CultureInfo.InvariantCulture, out val))
                    return val;
            }
            return 0.0;
        }

        private string SimpleJsonSerializer(object obj)
        {
            // Lightweight manual serializer to avoid external JSON library dependencies in NT8
            var sb = new StringBuilder();
            SerializeValue(obj, sb);
            return sb.ToString();
        }

        private void SerializeValue(object val, StringBuilder sb)
        {
            if (val == null) { sb.Append("null"); return; }
            if (val is string str) { sb.Append("\"").Append(str.Replace("\"", "\\\"")).Append("\""); return; }
            if (val is bool b) { sb.Append(b ? "true" : "false"); return; }
            if (val is double d) { sb.Append(d.ToString(CultureInfo.InvariantCulture)); return; }
            if (val is float f) { sb.Append(f.ToString(CultureInfo.InvariantCulture)); return; }
            if (val is int || val is long) { sb.Append(val.ToString()); return; }

            if (val is System.Collections.IEnumerable list && !(val is string))
            {
                sb.Append("[");
                bool first = true;
                foreach (var item in list)
                {
                    if (!first) sb.Append(",");
                    SerializeValue(item, sb);
                    first = false;
                }
                sb.Append("]");
                return;
            }

            // Object properties
            sb.Append("{");
            var props = val.GetType().GetProperties();
            bool firstProp = true;
            foreach (var p in props)
            {
                if (!firstProp) sb.Append(",");
                sb.Append("\"").Append(p.Name).Append("\":");
                SerializeValue(p.GetValue(val, null), sb);
                firstProp = false;
            }
            sb.Append("}");
        }
        #endregion

        #region Visual Elements (Lines & HUD)
        private void UpdateForecastLines()
        {
            if (forecastP50 <= 0) return;

            string tagP90 = "Chronos_P90_" + instrumentRoot;
            string tagP50 = "Chronos_P50_" + instrumentRoot;
            string tagP10 = "Chronos_P10_" + instrumentRoot;

            Draw.HorizontalLine(this, tagP90, forecastP90, P90Color, DashStyleHelper.Dash, 2);
            Draw.HorizontalLine(this, tagP50, forecastP50, P50Color, DashStyleHelper.Solid, 2);
            Draw.HorizontalLine(this, tagP10, forecastP10, P10Color, DashStyleHelper.Dash, 2);
        }

        private void UpdateOnChartHUD()
        {
            string hudTag = "Chronos_HUD_" + instrumentRoot;

            string statusColor = isBridgeConnected ? "LimeGreen" : "Orange";
            string driftSign = forecastDriftPct >= 0 ? "+" : "";

            string hudText = string.Format(
                "CHRONOS AI 100M — NT8 TRADOVATE BRIDGE\n" +
                "Instrument: {0} ({1}) | Price: {2:F2}\n" +
                "Status: {3} | Latency: {4}ms\n" +
                "----------------------------------------\n" +
                "Model: {5}\n" +
                "Horizon T+{6} Target (p50): {7:F2} ({8}{9:F2}%)\n" +
                "Bounds: p10={10:F2} | p90={11:F2}\n" +
                "Signal: {12} (Conf: {13:F0}%) | SL: {14:F2} | TP: {15:F2}",
                instrumentRoot,
                timeframeStr,
                lastSpotPrice,
                lastStatusMessage,
                roundtripLatencyMs,
                ModelVariant == "kronos-financial-100m" ? "Financial Kronos (AAAI 2026)" : "Amazon Chronos 100M",
                PredictionHorizon,
                forecastP50 > 0 ? forecastP50 : lastSpotPrice,
                driftSign,
                forecastDriftPct,
                forecastP10 > 0 ? forecastP10 : lastSpotPrice * 0.98,
                forecastP90 > 0 ? forecastP90 : lastSpotPrice * 1.02,
                forecastAction,
                forecastConfidence,
                forecastSL > 0 ? forecastSL : forecastP10,
                forecastTP > 0 ? forecastTP : forecastP50
            );

            Draw.TextFixed(this, hudTag, hudText, TextPosition.TopLeft, Brushes.White,
                new Gui.Tools.SimpleFont("Consolas", 10),
                Brushes.DimGray,
                Brushes.Black,
                80);
        }

        private void RemoveDrawingObjects()
        {
            RemoveDrawObject("Chronos_P90_" + instrumentRoot);
            RemoveDrawObject("Chronos_P50_" + instrumentRoot);
            RemoveDrawObject("Chronos_P10_" + instrumentRoot);
            RemoveDrawObject("Chronos_HUD_" + instrumentRoot);
        }
        #endregion
    }
}

#region NinjaScript Generated Code
namespace NinjaTrader.NinjaScript.Indicators
{
    public partial class Indicator : NinjaTrader.Gui.NinjaScript.IndicatorRenderBase
    {
        private ChronosNT8BridgeIndicator[] cacheChronosNT8BridgeIndicator;
        public ChronosNT8BridgeIndicator ChronosNT8BridgeIndicator(string bridgeUrl, int predictionHorizon, string modelVariant, int historicalBars, bool drawForecastLines, bool showHUD)
        {
            return ChronosNT8BridgeIndicator(Input, bridgeUrl, predictionHorizon, modelVariant, historicalBars, drawForecastLines, showHUD);
        }

        public ChronosNT8BridgeIndicator ChronosNT8BridgeIndicator(ISeries<double> input, string bridgeUrl, int predictionHorizon, string modelVariant, int historicalBars, bool drawForecastLines, bool showHUD)
        {
            if (cacheChronosNT8BridgeIndicator != null)
                for (int idx = 0; idx < cacheChronosNT8BridgeIndicator.Length; idx++)
                    if (cacheChronosNT8BridgeIndicator[idx] != null &&
                        cacheChronosNT8BridgeIndicator[idx].BridgeUrl == bridgeUrl &&
                        cacheChronosNT8BridgeIndicator[idx].PredictionHorizon == predictionHorizon &&
                        cacheChronosNT8BridgeIndicator[idx].ModelVariant == modelVariant &&
                        cacheChronosNT8BridgeIndicator[idx].HistoricalBars == historicalBars &&
                        cacheChronosNT8BridgeIndicator[idx].DrawForecastLines == drawForecastLines &&
                        cacheChronosNT8BridgeIndicator[idx].ShowHUD == showHUD &&
                        cacheChronosNT8BridgeIndicator[idx].EqualsInput(input))
                        return cacheChronosNT8BridgeIndicator[idx];
            return new ChronosNT8BridgeIndicator {
                BridgeUrl = bridgeUrl,
                PredictionHorizon = predictionHorizon,
                ModelVariant = modelVariant,
                HistoricalBars = historicalBars,
                DrawForecastLines = drawForecastLines,
                ShowHUD = showHUD
            };
        }
    }
}
#endregion
