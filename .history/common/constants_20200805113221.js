const SERVICES = {
  LINE: require("../service/line/controller"),
  LIVEAGENT: require("../service/liveagent/controller"),
  ROUTER: require("../service/router"),
};

const SERVICE_NAME = {
  LINE: "LINE",
  LIVEAGENT: "LIVEAGENT",
  ROUTER: "ROUTER",
};

// Not used
const POSTBACK_DATA = {
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

const LINE_AUTO_RESPONSE = {
  ACCOUNTLINKMESSAGE:
    "Lineで物件に関する問合せするおよび最新のお知ら情報せを受け取るため、Lineアカウントとコミュニティアカウントの連携が必要です。" +
    "アカウントを連携するため、リンクを開いてコミュニティにログインしてください。\n" +
    process.env.SALESFORCE_ACCOUNT_LINK_VF,
  ACCOUNTLINKSUCCEDEDMESSAGE:
    "アカウントが連携されました。物件に関するご不明な点やお困りの点がございましたらLineで問合せしてください。",
  ACCOUNTLINKFAILEDMESSAGE: "アカウント連携は失敗しました。",
};

module.exports = {
  SERVICE_NAME: SERVICE_NAME,
  SERVICES: SERVICES,
  POSTBACK_DATA: POSTBACK_DATA,
  LINE_AUTO_RESPONSE: LINE_AUTO_RESPONSE,
};
