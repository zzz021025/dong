function Screen() {}
var __imported_screen = require("./ui/index.ui.js");
Screen = __imported_screen.default || __imported_screen;

function registerToolPkg() {
  ToolPkg.registerUiRoute({
    id: "dreambox_app",
    route: "toolpkg:com.operit.dreambox:ui:dreambox_app",
    runtime: "compose_dsl",
    screen: Screen,
    params: {},
    keepAlive: true,
    title: {
      zh: "来信",
      en: "Dreambox"
    }
  });
  ToolPkg.registerNavigationEntry({
    id: "dreambox_sidebar_entry",
    route: "toolpkg:com.operit.dreambox:ui:dreambox_app",
    surface: "main_sidebar_plugins",
    title: {
      zh: "来信",
      en: "Dreambox"
    },
    order: 1
  });
  ToolPkg.registerNavigationEntry({
    id: "dreambox_toolbox_entry",
    route: "toolpkg:com.operit.dreambox:ui:dreambox_app",
    surface: "toolbox",
    title: {
      zh: "来信",
      en: "Dreambox"
    }
  });
  return true;
}

exports.registerToolPkg = registerToolPkg;
