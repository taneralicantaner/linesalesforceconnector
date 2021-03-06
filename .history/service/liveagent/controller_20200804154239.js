const USER_AGENT =
  //   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36";
  "Line Messenger";

const jsforce = require("jsforce");
let conn = new jsforce.Connection();

exports.initInstance = async (event) => {
  const SERVICE_NAME = require("../../common/constants").SERVICE_NAME;
  const Router = require("../../common/constants").SERVICES.ROUTER;
  let session = await createLiveAgentSession();
  session = await createChatVisitorSession(session, event.origin);
  session.name = "OPERATOR";
  session.service = SERVICE_NAME.LIVEAGENT;
  session = await initSession(session);
  const transcript = await Router.getTranscript(event.origin.id);

  if (transcript) {
    await sendMessage(session, transcript);
  }

  return session;
};

exports.destroyInstance = async (id) => {
  return await deleteSession(id);
};

const createLiveAgentSession = () => {
  var request = require("request");
  var options = {
    url: "https://" + process.env.LIVEAGENT_POD + "/chat/rest/System/SessionId",
    headers: {
      "X-LIVEAGENT-API-VERSION": process.env.LIVEAGENT_API_VERSION,
      "X-LIVEAGENT-AFFINITY": "null",
      Connection: "keep-alive",
    },
    json: true,
  };

  console.log("options", options);

  return new Promise(function(resolve, reject) {
    request.get(options, (error, response, body) => {
      if (error || response.statusCode != 200) {
        reject(error);
      } else {
        console.log("body", body);

        resolve({
          key: body.key,
          affinity: body.affinityToken,
          id: body.id,
          sequence: 1,
        });
      }
    });
  });
};

const createChatVisitorSession = async (session, origin) => {
  var request = require("request");
  var options = {
    url: "https://" + process.env.LIVEAGENT_POD + "/chat/rest/Chasitor/ChasitorInit",
    headers: {
      "X-LIVEAGENT-API-VERSION": process.env.LIVEAGENT_API_VERSION,
      "X-LIVEAGENT-SESSION-KEY": session.key,
      "X-LIVEAGENT-SEQUENCE": session.sequence,
      "X-LIVEAGENT-AFFINITY": session.affinity,
    },
    json: true,
    body: {
      organizationId: process.env.LIVEAGENT_ORGANIZATION_ID,
      deploymentId: process.env.LIVEAGENT_DEPLOYMENT_ID,
      buttonId: process.env.LIVEAGENT_BUTTON_ID,
      sessionId: session.id,
      trackingId: "",
      userAgent: USER_AGENT,
      language: "ja-JP",
      screenResolution: "750x1334",
      visitorName: await getVisitorName(origin).catch((e) => {
        console.log(e);
        return origin.name;
      }),
      prechatDetails: [
        {
          label: "ContactLineId",
          value: origin.id,
          entityMaps: [],
          transcriptFields: [],
          displayToAgent: false,
          doKnowledgeSearch: false,
        },
        {
          label: "顧客名",
          value: origin.name,
          entityMaps: [],
          transcriptFields: [],
          displayToAgent: true,
          doKnowledgeSearch: false,
        },
        {
          label: "Status",
          value: "New",
          entityMaps: [],
          transcriptFields: [],
          displayToAgent: false,
          doKnowledgeSearch: false,
        },
        {
          label: "Origin",
          value: "Line",
          entityMaps: [],
          transcriptFields: [],
          displayToAgent: false,
          doKnowledgeSearch: false,
        },
      ],
      buttonOverrides: [],
      receiveQueueUpdates: true,
      prechatEntities: [
        {
          entityName: "Contact",
          showOnCreate: true,
          linkToEntityName: "Case",
          linkToEntityField: "ContactId",
          saveToTranscript: "ContactId",
          entityFieldsMaps: [
            {
              fieldName: "LastName",
              label: "顧客名",
              doFind: false,
              isExactMatch: false,
              doCreate: true,
            },
            {
              fieldName: "LineId__c",
              label: "ContactLineId",
              doFind: true,
              isExactMatch: true,
              doCreate: true,
            },
          ],
        },
        {
          entityName: "Case",
          showOnCreate: true,
          saveToTranscript: "Case",
          entityFieldsMaps: [
            {
              fieldName: "Status",
              label: "Status",
              doFind: false,
              isExactMatch: false,
              doCreate: true,
            },
            {
              fieldName: "Origin",
              label: "Origin",
              doFind: false,
              isExactMatch: false,
              doCreate: true,
            },
          ],
        },
      ],
      isPost: true,
    },
  };
  return new Promise(function(resolve, reject) {
    request.post(options, (error, response, body) => {
      if (error || response.statusCode != 200) {
        reject(error);
      } else {
        session.sequence++;
        resolve(session);
      }
    });
  });
};

exports.processEvent = async (event) => {
  var session = await getSession(event.terminal.id);

  switch (event.type) {
    case "message":
      switch (event.message.type) {
        case "text":
          await onText(session, event);
          break;
        case "image":
          await onImage(session, event);
          break;
        case "video":
          await onVideo(session, event);
          break;
        case "audio":
          await onAudio(session, event);
          break;
        case "location":
          await onLocation(session, event);
          break;
        case "sticker":
          await onSticker(session, event);
          break;
        default:
          break;
      }
      break;
    case "follow":
      await onFollow(session, event);
      break;
    case "unfollow":
      await onUnfollow(session, event);
      break;
    case "join":
      await onJoin(session, event);
      break;
    case "leave":
      await onLeave(session, event);
      break;
    case "postback":
      await onPostback(session, event);
      break;
    case "beacon":
      await onBeacon(session, event);
      break;
    default:
      break;
  }
};

const onText = async (session, event) => {
  await sendMessage(session, event.message.text);
};

const onImage = async (session, event) => {
  if (session.file) {
    await uploadFile(session, event.content);
    session.file = null;
    await updateSessionFile(session);
  } else {
    await sendMessage(session, event.content.url);
  }
};

const onVideo = async (session, event) => {
  await sendMessage(session, event.content.url);
};

const onAudio = async (session, event) => {
  await sendMessage(session, event.content.url);
};

async function onLocation(session, event) {}

async function onSticker(session, event) {}

async function onFollow(session, event) {}

async function onUnfollow(session, event) {}

async function onJoin(session, event) {}

async function onLeave(session, event) {}

async function onPostback(session, event) {}

const sendMessage = async (session, text) => {
  var session = await incrementSessionSequence(session);
  var request = require("request");
  var options = {
    url: "https://" + process.env.LIVEAGENT_POD + "/chat/rest/Chasitor/ChatMessage",
    headers: {
      "X-LIVEAGENT-API-VERSION": process.env.LIVEAGENT_API_VERSION,
      "X-LIVEAGENT-SESSION-KEY": session.key,
      "X-LIVEAGENT-SEQUENCE": session.sequence,
      "X-LIVEAGENT-AFFINITY": session.affinity,
    },
    json: true,
    body: {
      text: session.sequence == 2 ? "チャット開始：" + text : text,
    },
  };
  return new Promise((resolve, reject) => {
    request.post(options, async (error, response, body) => {
      if (response.statusCode === 409) {
        session.sequence = Number(body.match(/\d+/g)[1]);
        await updateSessionSequence(session);
        reject(body);
      }
      if (error || response.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
};

const uploadFile = (session, content) => {
  var request = require("request");
  var query = "?orgId=" + process.env.LIVEAGENT_ORGANIZATION_ID;
  query += "&chatKey=" + session.key.slice(0, session.key.indexOf("!"));
  query += "&fileToken=" + session.file.fileToken;
  query += "&encoding=UTF-8";

  var options = {
    url: session.file.uploadServletUrl + query,
    headers: {
      Referer: session.file.cdmServletUrl,
      "User-Agent": USER_AGENT,
    },
    formData: {
      filename: content.filename,
      file: {
        value: content.data,
        options: {
          filename: content.filename,
          contentType: content.type,
        },
      },
    },
  };
  return new Promise((resolve, reject) => {
    request
      .post(options, function(error, response, body) {
        if (error || response.statusCode != 200) {
          reject(body);
        } else {
          resolve(body);
        }
      })
      .on("data", function(chunk) {
        console.log("sending");
      });
  });
};

const getVisitorName = (origin) => {
  return new Promise((resolve, reject) => {
    conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD, function(err) {
      if (err) {
        reject(err);
      }
      conn
        .sobject("Contact")
        .findOne({ LineId__c: origin.id }, "Name")
        .execute(function(err, record) {
          if (err) {
            reject(err);
          } else if (!record) {
            resolve(origin.name);
          }
          resolve(record.Name);
        });
    });
  });
};

function log(message) {
  console.log(message);
}

var DB = require("../../db/mongodb");
var COLLECTION_NAME = "LIVEAGENT";
const initSession = async (session) => {
  return (await DB.collection(COLLECTION_NAME).insertOne(session)).ops[0];
};
const incrementSessionSequence = async (session) => {
  return (
    await DB.collection(COLLECTION_NAME).findOneAndUpdate(
      { id: session.id },
      { $inc: { sequence: 1 } },
      { returnOriginal: true }
    )
  ).value;
};
const updateSessionSequence = async (session) => {
  return (
    await DB.collection(COLLECTION_NAME).findOneAndUpdate(
      { id: session.id },
      { $set: { sequence: session.sequence } },
      { returnOriginal: true }
    )
  ).value;
};
const getSession = (sessionId) => {
  return DB.collection(COLLECTION_NAME)
    .find({ id: sessionId })
    .limit(1)
    .next();
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
const deleteSession = async (sessionId) => {
  return await DB.collection(COLLECTION_NAME).deleteOne({ id: sessionId });
};
