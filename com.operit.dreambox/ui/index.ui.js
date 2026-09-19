function Screen(ctx) {
  var panelController = ctx.createWebViewController("dreambox_panel");

  var STORE_DIR = "/sdcard/Download/Operit/dreambox/";
  var STORE_PATH = STORE_DIR + "store.json";
  var __dirReady = false;

  async function __dbReadStore() {
    try {
      var raw = await Tools.Files.read(STORE_PATH);
      return (raw && typeof raw.content === "string") ? raw.content : "";
    } catch (e) {
      return "";
    }
  }

  async function __dbWriteStore(json) {
    try {
      var obj = JSON.parse(json);
      if (!obj || typeof obj !== "object") throw new Error("invalid store object");
      if (!__dirReady) {
        await Tools.Files.mkdir(STORE_DIR, true);
        __dirReady = true;
      }
      await Tools.Files.write(STORE_PATH, JSON.stringify(obj));
      return JSON.stringify({ success: true });
    } catch (e) {
      return JSON.stringify({ success: false, message: "" + (e && e.message) });
    }
  }

  panelController.addJavascriptInterface("NativeDreambox", {
    load: async function () {
      try { return await __dbReadStore(); } catch (e) { return ""; }
    },
    save: async function (json) {
      try { return await __dbWriteStore(json); } catch (e) { return ""; }
    },
    ping: function () { return "pong"; }
  });

  var __DB_JS = `PLACEHOLDER_UI_JS`;

  function buildHtml() {
    return PLACEHOLDER_HTML;
  }

  return ctx.UI.WebView({
    html: buildHtml(),
    baseUrl: "about:blank",
    javaScriptEnabled: true,
    domStorageEnabled: true,
    controller: panelController
  });
}
exports.default = Screen;
