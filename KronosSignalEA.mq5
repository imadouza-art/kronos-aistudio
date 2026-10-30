//+------------------------------------------------------------------+
//|                                              KronosSignalEA.mq5  |
//|     Kronos & Chronos 100M AI Foundation Model - Real-Time Signals |
//|                     Copyright 2026, AI Studio Build              |
//|               https://github.com/amazon-science/chronos-forecasting |
//+------------------------------------------------------------------+
#property copyright "AI Studio Build - Kronos AI"
#property link      "http://localhost:3000"
#property version   "1.00"
#property description "Displays p10 (Bearish), p50 (Median), and p90 (Bullish) predictive quantiles from the Kronos 100M AI Foundation Model."
#property expert_show_inputs

//--- Inputs
input group "=== KRONOS AI VISUAL SETTINGS ==="
input color   InpP90Color       = clrLimeGreen;   // P90 (Bull Boundary) Line Color
input color   InpP50Color       = clrGold;        // P50 (Median Forecast) Line Color
input color   InpP10Color       = clrCrimson;     // P10 (Bear Boundary) Line Color
input int     InpLineWidth      = 2;              // Forecast Line Width
input ENUM_LINE_STYLE InpLineStyle = STYLE_SOLID; // Forecast Line Style

input group "=== ON-CHART HUD DASHBOARD ==="
input bool    InpShowPanel      = true;           // Show Dashboard Panel
input int     InpPanelX         = 20;             // Panel X Offset (px)
input int     InpPanelY         = 30;             // Panel Y Offset (px)
input color   InpPanelBg        = C'15,23,42';    // Slate 900 Background Color
input color   InpPanelBorder    = C'51,65,85';    // Slate 700 Border Color
input color   InpTextColor      = clrWhite;       // Text Color

input group "=== SYMBOL & TIMEFRAME ==="
input string  InpOverrideSymbol = "";             // Custom Symbol (Leave blank for current chart)

//--- Internal State
string g_cleanSymbol = "";
string g_objPrefix = "KronosAI_";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   string sym = (InpOverrideSymbol != "") ? InpOverrideSymbol : _Symbol;
   g_cleanSymbol = sym;
   StringReplace(g_cleanSymbol, ".", "_");
   StringReplace(g_cleanSymbol, "#", "_");

   // Create or refresh visual objects
   CreateOrUpdateLine(g_objPrefix + "P90", InpP90Color, "Kronos P90 (Bull 90%)");
   CreateOrUpdateLine(g_objPrefix + "P50", InpP50Color, "Kronos P50 (Median Target)");
   CreateOrUpdateLine(g_objPrefix + "P10", InpP10Color, "Kronos P10 (Bear 10%)");

   if(InpShowPanel)
   {
      CreateDashboard();
   }

   // Trigger immediate tick calculation
   EventSetTimer(1);
   OnTimer();

   Print("[KronosSignalEA] Initialized for symbol: ", sym, " (key: ", g_cleanSymbol, ")");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   ObjectsDeleteAll(0, g_objPrefix);
   ChartRedraw(0);
   Print("[KronosSignalEA] Cleaned up chart objects.");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   UpdateForecastDisplay();
}

//+------------------------------------------------------------------+
//| Timer event function (periodic check even during market quiet)   |
//+------------------------------------------------------------------+
void OnTimer()
{
   UpdateForecastDisplay();
}

//+------------------------------------------------------------------+
//| Fetch latest Global Variables and refresh lines + panel          |
//+------------------------------------------------------------------+
void UpdateForecastDisplay()
{
   double p10 = 0.0;
   double p50 = 0.0;
   double p90 = 0.0;
   double spot = 0.0;
   double drift = 0.0;
   datetime updated = 0;
   double actionVal = 0.0;
   double sigSL = 0.0;
   double sigTP = 0.0;
   double sigConf = 0.0;

   // 1. Try symbol-specific keys first
   string kP10 = "Kronos_" + g_cleanSymbol + "_p10";
   string kP50 = "Kronos_" + g_cleanSymbol + "_p50";
   string kP90 = "Kronos_" + g_cleanSymbol + "_p90";
   string kSpot = "Kronos_" + g_cleanSymbol + "_spot";
   string kDrift = "Kronos_" + g_cleanSymbol + "_drift";
   string kUpd = "Kronos_" + g_cleanSymbol + "_updated";
   string kAct = "Kronos_" + g_cleanSymbol + "_action";
   string kSL = "Kronos_" + g_cleanSymbol + "_sl";
   string kTP = "Kronos_" + g_cleanSymbol + "_tp";
   string kConf = "Kronos_" + g_cleanSymbol + "_conf";

   if(GlobalVariableCheck(kP50))
   {
      p10 = GlobalVariableGet(kP10);
      p50 = GlobalVariableGet(kP50);
      p90 = GlobalVariableGet(kP90);
      spot = GlobalVariableGet(kSpot);
      drift = GlobalVariableGet(kDrift);
      updated = (datetime)GlobalVariableGet(kUpd);
      if(GlobalVariableCheck(kAct)) actionVal = GlobalVariableGet(kAct);
      if(GlobalVariableCheck(kSL)) sigSL = GlobalVariableGet(kSL);
      if(GlobalVariableCheck(kTP)) sigTP = GlobalVariableGet(kTP);
      if(GlobalVariableCheck(kConf)) sigConf = GlobalVariableGet(kConf);
   }
   // 2. Fallback to universal keys
   else if(GlobalVariableCheck("Kronos_p50"))
   {
      p10 = GlobalVariableGet("Kronos_p10");
      p50 = GlobalVariableGet("Kronos_p50");
      p90 = GlobalVariableGet("Kronos_p90");
      spot = GlobalVariableGet("Kronos_spot");
      drift = GlobalVariableGet("Kronos_drift");
      updated = (datetime)GlobalVariableGet("Kronos_updated");
      if(GlobalVariableCheck("Kronos_action")) actionVal = GlobalVariableGet("Kronos_action");
      if(GlobalVariableCheck("Kronos_sl")) sigSL = GlobalVariableGet("Kronos_sl");
      if(GlobalVariableCheck("Kronos_tp")) sigTP = GlobalVariableGet("Kronos_tp");
      if(GlobalVariableCheck("Kronos_conf")) sigConf = GlobalVariableGet("Kronos_conf");
   }

   bool hasData = (p50 > 0.0);
   double currentPrice = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(spot <= 0.0) spot = currentPrice;

   // Update horizontal price levels
   if(hasData)
   {
      SetLinePrice(g_objPrefix + "P90", p90);
      SetLinePrice(g_objPrefix + "P50", p50);
      SetLinePrice(g_objPrefix + "P10", p10);
   }

   // Update HUD dashboard text
   if(InpShowPanel)
   {
      UpdateDashboard(hasData, spot, p10, p50, p90, drift, updated, actionVal, sigSL, sigTP, sigConf);
   }

   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//| Helper: Create or update horizontal forecast line                |
//+------------------------------------------------------------------+
void CreateOrUpdateLine(string name, color lineColor, string tooltip)
{
   if(ObjectFind(0, name) < 0)
   {
      ObjectCreate(0, name, OBJ_HLINE, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_COLOR, lineColor);
      ObjectSetInteger(0, name, OBJPROP_WIDTH, InpLineWidth);
      ObjectSetInteger(0, name, OBJPROP_STYLE, InpLineStyle);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_BACK, false);
      ObjectSetString(0, name, OBJPROP_TOOLTIP, tooltip);
   }
}

void SetLinePrice(string name, double price)
{
   if(ObjectFind(0, name) >= 0)
   {
      ObjectSetDouble(0, name, OBJPROP_PRICE, price);
   }
}

//+------------------------------------------------------------------+
//| Helper: Create Dashboard labels                                  |
//+------------------------------------------------------------------+
void CreateDashboard()
{
   int totalRows = 7;
   int rowHeight = 18;
   int panelWidth = 260;
   int panelHeight = 22 + (totalRows * rowHeight);

   // Background rectangle
   string bgName = g_objPrefix + "HUD_BG";
   if(ObjectFind(0, bgName) < 0)
   {
      ObjectCreate(0, bgName, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, bgName, OBJPROP_XDISTANCE, InpPanelX);
      ObjectSetInteger(0, bgName, OBJPROP_YDISTANCE, InpPanelY);
      ObjectSetInteger(0, bgName, OBJPROP_XSIZE, panelWidth);
      ObjectSetInteger(0, bgName, OBJPROP_YSIZE, panelHeight);
      ObjectSetInteger(0, bgName, OBJPROP_BGCOLOR, InpPanelBg);
      ObjectSetInteger(0, bgName, OBJPROP_BORDER_COLOR, InpPanelBorder);
      ObjectSetInteger(0, bgName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, bgName, OBJPROP_SELECTABLE, false);
   }

   // Title label
   CreateLabel(g_objPrefix + "HUD_Title", InpPanelX + 10, InpPanelY + 8, "KRONOS 100M AI FOUNDATION", InpP50Color, 9, true);

   // Status rows
   CreateLabel(g_objPrefix + "HUD_Status", InpPanelX + 10, InpPanelY + 28, "Waiting for mt5_bridge.py...", clrSilver, 8, false);
   CreateLabel(g_objPrefix + "HUD_Spot",   InpPanelX + 10, InpPanelY + 46, "Spot Price: ---", InpTextColor, 8, false);
   CreateLabel(g_objPrefix + "HUD_P90",    InpPanelX + 10, InpPanelY + 64, "P90 (Bull): ---", InpP90Color, 8, false);
   CreateLabel(g_objPrefix + "HUD_P50",    InpPanelX + 10, InpPanelY + 82, "P50 (Median): ---", InpP50Color, 8, true);
   CreateLabel(g_objPrefix + "HUD_P10",    InpPanelX + 10, InpPanelY + 100, "P10 (Bear): ---", InpP10Color, 8, false);
   CreateLabel(g_objPrefix + "HUD_Bias",   InpPanelX + 10, InpPanelY + 118, "Bias: Neutral", clrSilver, 8, true);
   CreateLabel(g_objPrefix + "HUD_Sync",   InpPanelX + 10, InpPanelY + 136, "Updated: Never", clrGray, 7, false);
}

void CreateLabel(string name, int x, int y, string text, color clr, int fontSize, bool isBold)
{
   if(ObjectFind(0, name) < 0)
   {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
      ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
      ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontSize);
      ObjectSetString(0, name, OBJPROP_FONT, isBold ? "Arial Bold" : "Arial");
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetString(0, name, OBJPROP_TEXT, text);
   }
}

void SetLabelText(string name, string text, color clr = clrNONE)
{
   if(ObjectFind(0, name) >= 0)
   {
      ObjectSetString(0, name, OBJPROP_TEXT, text);
      if(clr != clrNONE)
      {
         ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
      }
   }
}

//+------------------------------------------------------------------+
//| Update HUD Dashboard values                                      |
//+------------------------------------------------------------------+
void UpdateDashboard(bool hasData, double spot, double p10, double p50, double p90, double drift, datetime updated, double actionVal = 0.0, double sigSL = 0.0, double sigTP = 0.0, double sigConf = 0.0)
{
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   if(digits <= 0) digits = 2;

   if(!hasData)
   {
      SetLabelText(g_objPrefix + "HUD_Status", "Status: Connect mt5_bridge.py", clrOrange);
      SetLabelText(g_objPrefix + "HUD_Spot",   StringFormat("Spot Price: %.*f", digits, spot), InpTextColor);
      return;
   }

   // Status & sync time
   datetime now = TimeCurrent();
   int ageSec = (int)(now - updated);
   string ageStr = (ageSec >= 0 && ageSec < 120) ? StringFormat("%ds ago (Live)", ageSec) : "Syncing...";

   SetLabelText(g_objPrefix + "HUD_Status", "Status: Live Remote AI Feed", clrLime);
   SetLabelText(g_objPrefix + "HUD_Spot",   StringFormat("Spot Price: %.*f", digits, spot), InpTextColor);
   SetLabelText(g_objPrefix + "HUD_P90",    StringFormat("P90 (Bull 90%%): %.*f", digits, p90), InpP90Color);
   SetLabelText(g_objPrefix + "HUD_P50",    StringFormat("P50 (Median T+24): %.*f", digits, p50), InpP50Color);
   SetLabelText(g_objPrefix + "HUD_P10",    StringFormat("P10 (Bear 10%%): %.*f", digits, p10), InpP10Color);

   // AI Execution Signal
   string actionText = "FLAT";
   color actionColor = clrSilver;
   if(actionVal > 0.5)
   {
      actionText = StringFormat("BUY / LONG (SL: %.*f | TP: %.*f)", digits, sigSL, digits, sigTP);
      actionColor = clrLime;
   }
   else if(actionVal < -0.5)
   {
      actionText = StringFormat("SELL / SHORT (SL: %.*f | TP: %.*f)", digits, sigSL, digits, sigTP);
      actionColor = clrCrimson;
   }
   else
   {
      actionText = StringFormat("FLAT / WAIT (TP: %.*f)", digits, sigTP);
      actionColor = clrGold;
   }

   SetLabelText(g_objPrefix + "HUD_Bias", "Action: " + actionText, actionColor);
   SetLabelText(g_objPrefix + "HUD_Sync", StringFormat("Conf: %.0f%% | Sync: %s | Drift: %+.2f%%", sigConf, ageStr, drift), clrGray);
}
//+------------------------------------------------------------------+
