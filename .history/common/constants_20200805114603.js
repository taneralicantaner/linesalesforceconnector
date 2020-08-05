exports.SERVICES = {
  LINE: require("../service/line/controller"),
  LIVEAGENT: require("../service/liveagent/controller"),
  ROUTER: require("../service/router"),
};

exports.SERVICE_NAME = {
  LINE: "LINE",
  LIVEAGENT: "LIVEAGENT",
  ROUTER: "ROUTER",
};

// Not used
exports.POSTBACK_DATA = {
  PROCESSOR: {
    ROUTER: SERVICE_NAME.ROUTER,
  },
  ACTION: {
    SWITCH_ORIGIN: "SWITCH_ORIGIN",
    SWITCH_TERMINAL: "SWITCH_TERMINAL",
  },
  OPTION: {
    LINE: SERVICE_NAME.LINE,
    LIVEAGENT: SERVICE_NAME.LIVEAGENT,
    ROUTER: SERVICE_NAME.ROUTER,
  },
};

// module.exports = {
//   SERVICE_NAME: SERVICE_NAME,
//   SERVICES: SERVICES,
//   POSTBACK_DATA: POSTBACK_DATA,
// };
