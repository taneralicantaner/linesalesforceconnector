const Transcript = require("./transcript");

const SERVICES = require("../common/constants").SERVICES;
const SERVICE_NAME = require("../common/constants").SERVICE_NAME;
/*
event = {
      type: 'message',
      origin: {
        id: 'U206d25c2ea6bd87c17655609a1c37cb8',
        service: SERVICE.LINE,
        name: '太郎',
        pictureUrl: 'http://dl.profile.line-cdn.net/0m0e63c1c87251f833e1d31971683c00c2be89b1cd7809'
      },
      terminal: {
        id: 'U206d25c2ea6bd87c17655609a1c37cb8',
        service: SERVICE.LINE,
      }
      message: {
        id: '325708',
        type: 'text',
        text: 'Hello, world'
      },

      // type = template の場合
      template: {
        type: "buttons",
        thumbnailImageUrl: "https://example.com/bot/images/image.jpg",
        title: "Menu",
        text: "Please select",
        actions: [
          {
            type: "postback",
            label: "Buy",
            data: "action=buy&itemid=123"
          },
          {
            type: "postback",
            label: "Add to cart",
            data: "action=add&itemid=123"
          },
          {
            type: "uri",
            label: "View detail",
            uri: "http://example.com/page/123"
          }
        ]
      }

      "postback": {
       "data": "action=buyItem&itemId=123123&color=red"
      }

baton = {
  message: {
    type: 'text',
    text: 'Hello, world'
  }
}
*/

exports.processEvent = async (event) => {
  if (!event.message) return;
  info("ROUTER:processEvent:イベントを受け取り");
  debug("ROUTER:processEvent:terminal");
  let terminal = await getTerminal(event.origin.id);
  let transcriptId = await getTranscriptId(event.origin.id);
  debug(terminal);

  if (!terminal) {
    info("ROUTER:processEvent:デフォルト設定で新規ルーティングの作成");
    debug("ROUTER:processEvent:terminal");
    transcriptId = await Transcript.init();

    if (event.type == "message" || event.type == "postback") {
      terminal = await SERVICES[SERVICE_NAME.LIVEAGENT].initInstance(event);
      debug(terminal);

      terminal = await addTerminal(event.origin.id, terminal, transcriptId);
      await addTerminal(terminal.id, event.origin, transcriptId);
    } else {
      terminal = event.origin;
      await addTerminal(event.origin.id, terminal, transcriptId);
    }
  } else if ((event.type == "message" || event.type == "postback") && event.origin.id == terminal.id) {
    let instance = await SERVICES[SERVICE_NAME.LIVEAGENT].initInstance(event);
    terminal = await updateTerminal(event.origin.id, instance);
    await addTerminal(terminal.id, event.origin, transcriptId);
  }

  await Transcript.append(transcriptId, event);
  debug("ROUTER:processEvent:event");
  event.terminal = terminal;
  debug(event);

  info("ROUTER:processEvent:イベントを " + SERVICE_NAME[terminal.service] + " にルーティング");
  await SERVICES[terminal.service].processEvent(event);
};

exports.getTranscript = async (instanceId) => {
  let transcriptId = await getTranscriptId(instanceId);
  if (!transcriptId) {
    return;
  }
  return await Transcript.flush(transcriptId);
};

const info = (message) => {
  console.log(message);
};
const debug = (message) => {
  console.log(message);
};

var DB = require("../db/mongodb");
var COLLECTION_NAME = "RESPONDER";
async function getTerminal(id) {
  const route = await DB.collection(COLLECTION_NAME)
    .find({ originId: id })
    .limit(1)
    .next();
  if (route) {
    return route.terminal;
  }
  return null;
}
async function getTranscriptId(id) {
  const route = await DB.collection(COLLECTION_NAME)
    .find({ originId: id })
    .limit(1)
    .next();
  if (route) {
    return route.transcriptId;
  }
  return null;
}
async function addTerminal(originId, terminal, transcriptId) {
  const route = { originId: originId, terminal: terminal, transcriptId: transcriptId };
  return (await DB.collection(COLLECTION_NAME).insertOne(route)).ops[0].terminal;
}
async function updateTerminal(originId, terminal) {
  return (
    await DB.collection(COLLECTION_NAME).findOneAndUpdate(
      { originId: originId },
      { $set: { terminal: terminal } },
      { returnOriginal: false }
    )
  ).value.terminal;
}
exports.deleteRoute = async (id) => {
  return await DB.collection(COLLECTION_NAME).deleteOne({ originId: id });
};
exports.deleteRouteByTerminalId = async (id) => {
  return await DB.collection(COLLECTION_NAME).deleteOne({ "terminal.id": id });
};
