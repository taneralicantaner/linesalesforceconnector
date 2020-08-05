const ROUTER = require("../../common/constants").SERVICES.ROUTER;

exports.startLiveAgentSessionMonitor = () => {
  setInterval(async () => {
    const sessions = await getNewSessions();

    for (let session of sessions) {
      info("LIVEAGENT:startLiveAgentSessionMonitor:セッション[" + session.id + "] に対するイベントループ開始");
      monitorChatActivity(session.id);
    }
  }, 3000);
};

const monitorChatActivity = async (sessionId) => {
  debug("LIVEAGENT:monitorChatActivity:[" + sessionId + "]:session");
  var session = await getSession(sessionId);
  debug(session);

  if (!session) return;

  session.ack = session.ack === undefined ? -1 : session.ack;
  var request = require("request");
  var options = {
    url: "https://" + process.env.LIVEAGENT_POD + "/chat/rest/System/Messages",
    qs: {
      ack: session.ack,
    },
    headers: {
      "X-LIVEAGENT-API-VERSION": process.env.LIVEAGENT_API_VERSION,
      "X-LIVEAGENT-SESSION-KEY": session.key,
      "X-LIVEAGENT-AFFINITY": session.affinity,
    },
    json: true,
  };
  request.get(options, async (error, response, body) => {
    if (response.statusCode === 204) {
      monitorChatActivity(session.id);
    } else if (response.statusCode === 200) {
      session.ack = body.sequence;
      session = await updateSessionAck(session);
      asyncForEach(body.messages, async function(message) {
        console.log(message);
        await processMessage(session, message);
      });
      monitorChatActivity(session.id);
    } else {
      endMonitorChatActivity(session.id);
    }
  });
};

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const endMonitorChatActivity = async (session) => {
  info("LIVEAGENT:endMonitorChatActivity:セッション[" + session.id + "] に対するイベントモニタリングを終了");
  await deleteSession(session.id);
  await ROUTER.deleteRoute(session.id);
  await ROUTER.deleteRouteByTerminalId(session.id);
};

const processMessage = async (session, message) => {
  switch (message.type) {
    case "ChatMessage":
      await onChatMessage(session, message);
      break;
    case "RichMessage":
      await onRichMessage(session, message);
      break;
    case "AgentTyping":
      await onAgentTyping(session);
      break;
    case "AgentNotTyping":
      await onAgentNotTyping(session);
      break;
    case "AgentDisconnect":
      await onAgentDisconnect(session);
      break;
    case "ChasitorSessionData":
      await onChasitorSessionData(session);
      break;
    case "ChatEnded":
      await onChatEnded(session);
      break;
    case "ChatEstablished":
      await onChatEstablished(session);
      break;
    case "ChatRequestFail":
      await onChatRequestFail(session);
      break;
    case "ChatRequestSuccess":
      await onChatRequestSuccess(session);
      break;
    case "ChatTransferred":
      await onChatTransferred(session);
      break;
    case "CustomEvent":
      await onCustomEvent(session);
      break;
    case "NewVisitorBreadcrumb":
      await onNewVisitorBreadcrumb(session);
      break;
    case "QueueUpdate":
      await onQueueUpdate(session);
      break;
    case "FileTransfer":
      await onFileTransfer(session, message);
      break;
    case "Availability":
      await onAvailability(session);
      break;
    case "TransferToButtonInitiated":
      await onTransferToButtonInitiated(session);
      break;
    default:
      break;
  }
};

const onChatMessage = async (session, message) => {
  info("LIVEAGENT:onChatMessage:オペレーターからメッセージを受信");
  await ROUTER.processEvent(createEvent(session, "message", { type: "text", text: message.message.text }));
};
const onRichMessage = async (session, message) => {
  info("LIVEAGENT:onChatMessage:オペレーターからメッセージを受信");
  let buttons = await createButtons(message.message.items);
  await ROUTER.processEvent(createEvent(session, "message", buttons));
};

const onAgentDisconnect = async (session) => {
  info("LIVEAGENT:onAgentDisconnect:オペレーターとの接続が切断");
  await ROUTER.processEvent(
    createEvent(session, "message", { type: "text", text: "オペレータとの接続が切断しました。" })
  );
  endMonitorChatActivity(session);
};

const onChatEnded = async (session, message) => {
  info("LIVEAGENT:onChatEnded:チャットを終了");
  await ROUTER.processEvent(createEvent(session, "message", { type: "text", text: "チャットが終了しました。" }));
  endMonitorChatActivity(session);
  //   if (message.message.reason == "chatbotEndedChat") {
  //     info("LIVEAGENT:onChatEnded:チャットボットがチャットを終了");
  //     await Router.processEvent(
  //       createEvent(session, "message", { type: "text", text: "チャットボットがチャットを終了しました。" })
  //     );
  //   } else {
  //     info("LIVEAGENT:onChatEnded:オペレータがチャットを終了");
  //     await Router.processEvent(
  //       createEvent(session, "message", { type: "text", text: "オペレータがチャットを終了しました。" })
  //     );
  //   }
};
const onChatEstablished = async (session, message) => {
  if (message.message.userId.startsWith("0Xx")) {
    // info("LIVEAGENT:onChatEstablished:チャットボットと接続");
    // await Router.processEvent(
    //   createEvent(session, "message", { type: "text", text: "チャットボットと接続されました。" })
    // );
  } else {
    info("LIVEAGENT:onChatEstablished:オペレータと接続");
    await ROUTER.processEvent(createEvent(session, "message", { type: "text", text: "オペレータと接続されました。" }));
  }
};
const onChatRequestFail = async (session) => {
  info("LIVEAGENT:onChatRequestFail:現在対応可能なオペレータがいません");
  await ROUTER.processEvent(
    createEvent(session, "message", { type: "text", text: "現在対応可能なオペレータがいません。" })
  );
  endMonitorChatActivity(session);
};
const onChatRequestSuccess = async (session) => {
  //   if (message.message.queuePosition > 0) {
  //     info("LIVEAGENT:onChatRequestSuccess:オペレータを呼び出しています");
  //     await Router.processEvent(
  //       createEvent(session, "message", { type: "text", text: "オペレータを呼び出しています。" })
  //     );
  //   }
};
const onTransferToButtonInitiated = async (session) => {
  info("LIVEAGENT:onTransferToButtonInitiated:オペレータを呼び出しています");
  await ROUTER.processEvent(createEvent(session, "message", { type: "text", text: "オペレータを呼び出しています。" }));
};
const onChatTransferred = async (session) => {
  //   info("LIVEAGENT:onChatTransferred:オペレータと接続");
  //   await Router.processEvent(createEvent(session, "message", { type: "text", text: "オペレータと接続されました。" }));
};

const onFileTransfer = async (session, message) => {
  if (message.message.type === "Requested") {
    info("LIVEAGENT:onFileTransfer:オペレータをファイル送信を許可");
    var session = await getSession(session.id);
    session.file = message.message;
    await updateSessionFile(session);
    await ROUTER.processEvent(
      createEvent(session, "message", {
        type: "text",
        text: "オペレータが画像ファイル1枚の送信を許可しました。",
      })
    );
  } else if (message.message.type === "Canceled") {
    info("LIVEAGENT:onFileTransfer:オペレータをファイル送信の許可を取り消し");
    var session = await getSession(session.id);
    session.file = null;
    await updateSessionFile(session);
    await ROUTER.processEvent(
      createEvent(session, "message", {
        type: "text",
        text: "オペレータがファイル送信の許可を取り消しました。",
      })
    );
  }
};
const onAvailability = async (session) => {};
const onCustomEvent = async (session) => {};
const onNewVisitorBreadcrumb = async (session) => {};
const onQueueUpdate = async (session) => {};
const onAgentTyping = async (session) => {};
const onAgentNotTyping = async (session) => {};
const onChasitorSessionData = async (session) => {};

const createEvent = (session, type, message) => {
  info("LIVEAGENTMONITOR:createEvent:イベントを作成");
  debug("LIVEAGENTMONITOR:createEvent:event");
  var event = {
    type: type,
    origin: {
      id: session.id,
      name: session.name,
      service: session.service,
    },
    message: message,
  };
  debug(event);
  return event;
};

const createButtons = async (items) => {
  let actions = [];
  items.forEach((i) =>
    // actions.push({
    //   type: "postback",
    //   label: i.text,
    //   data: i.text,
    // })
    actions.push({
      type: "message",
      label: i.text,
      text: i.text,
    })
  );
  let buttons = {
    type: "template",
    altText: "何かお困りですか？",
    template: {
      type: "buttons",
      text: "何かお困りですか？",
      actions: actions,
    },
  };
  return buttons;
};

const info = (message) => {
  console.log(message);
};
const debug = (message) => {
  console.log(message);
};

var DB = require("../../db/mongodb");
var COLLECTION_NAME = "LIVEAGENT";
const updateSession = async (session) => {
  return (await DB.collection(COLLECTION_NAME).findOneAndUpdate({ id: session.id }, { $set: session })).value;
};
const updateSessionAck = async (session) => {
  return (
    await DB.collection(COLLECTION_NAME).findOneAndUpdate(
      { id: session.id },
      { $set: { ack: session.ack } },
      { returnOriginal: false }
    )
  ).value;
};
const updateSessionFile = async (session) => {
  return (
    await DB.collection(COLLECTION_NAME).findOneAndUpdate(
      { id: session.id },
      { $set: { file: session.file } },
      { returnOriginal: false }
    )
  ).value;
};

const getNewSessions = () => {
  return DB.collection(COLLECTION_NAME)
    .find({ ack: undefined })
    .toArray();
};

const getSession = (sessionId) => {
  return DB.collection(COLLECTION_NAME)
    .find({ id: sessionId })
    .limit(1)
    .next();
};
const deleteSession = async (sessionId) => {
  return await DB.collection(COLLECTION_NAME).deleteOne({ id: sessionId });
};
