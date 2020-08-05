const SERVICE_NAME = require("../../common/constants").SERVICE_NAME;
const POSTBACK_DATA = require("../../common/constants").POSTBACK_DATA;
const ROUTER = require("../../common/constants").SERVICES.ROUTER;
const LINE_POSTBACK_MAP = {
  感情分析を開始:
    POSTBACK_DATA.PROCESSOR.ROUTER +
    "," +
    POSTBACK_DATA.ACTION.SWITCH_TERMINAL +
    "," +
    POSTBACK_DATA.OPTION.EINSTEIN_SENTIMENT,
  意図分析を開始:
    POSTBACK_DATA.PROCESSOR.ROUTER +
    "," +
    POSTBACK_DATA.ACTION.SWITCH_TERMINAL +
    "," +
    POSTBACK_DATA.OPTION.EINSTEIN_INTENT,
  チャットを開始:
    POSTBACK_DATA.PROCESSOR.ROUTER + "," + POSTBACK_DATA.ACTION.SWITCH_TERMINAL + "," + POSTBACK_DATA.OPTION.LIVEAGENT,
  ボットを開始:
    POSTBACK_DATA.PROCESSOR.ROUTER + "," + POSTBACK_DATA.ACTION.SWITCH_TERMINAL + "," + POSTBACK_DATA.OPTION.SIMPLEBOT,
};
const jsforce = require("jsforce");

exports.processRequest = (req) => {
  info("LINE:processRequest:リクエストを受信");
  req.body.events.forEach(async (event) => {
    info("LINE:processRequest:イベントを処理");
    debug("LINE:processRequest:id:");
    const id = event.source.userId || event.source.groupId || event.source.roomId;
    debug(id);

    debug("LINE:processRequest:instance:");
    let instance = await getInstance(id);
    debug(instance);
    if (instance) {
      // Event from exsisting user
      info("LINE:processRequest:既存LINEユーザー");
      debug("LINE:processRequest:instance:");
      instance = await updateInstance(id, event);
      debug(instance);
    } else {
      // Event from new user
      info("LINE:processRequest:新規LINEユーザー");
      debug("LINE:processRequest:profile:");
      const profile = await getUserProfile(id).catch((error) => {
        console.log(error);
      });
      debug(profile);
      debug("LINE:processRequest:instance:");
      instance = await initInstance(id, profile, event);
      debug(instance);
    }
    debug("LINE:processRequest:event:");
    event = await createEvent(instance.profile, event);
    debug(event);
    info("LINE:processRequest:イベントをルーティング");
    await ROUTER.processEvent(event);
  });
};

exports.processEvent = async (event) => {
  info("LINE:processEvent:イベントを受け取り");
  debug("LINE:processEvent:instance:");
  const instance = await getInstance(event.origin.id);
  debug(instance);

  debug("LINE:processEvent:body:");
  const body = {};
  body.messages = [event.message];
  body.to = event.terminal.id;
  debug(body);

  info("LINE:processEvent:イベントをプッシュ");
  sendPushEvent(body).catch((error) => {
    console.log(error);
  });
};

exports.processSFNotification = (req) => {
  req.body.forEach(async (b, index) => {
    sendMulticastEvent(JSON.parse(b)).catch((error) => {
      console.log(error);
    });
  });
};

const createEvent = async (profile, event) => {
  const e = {
    type: event.type,
    origin: {
      id: event.source.userId || event.source.groupId || event.source.roomId,
      service: SERVICE_NAME.LINE,
      name: profile.displayName,
      pictureUrl: profile.pictureUrl,
    },
    message: event.message,
  };

  if (event.type === "message") {
    const message = event.message;
    if (message.type === "text") {
      const data = LINE_POSTBACK_MAP[event.message.text];
      if (data) {
        e.type = "postback";
        e.postback = { data: data };
      }
    } else if (message.type === "image") {
      content = await getContent(message.id, message.id + ".jpeg");
      e.content = content;
    } else if (message.type === "video") {
      content = await getContent(message.id, message.id + ".mp4");
      e.content = content;
    } else if (message.type === "audio") {
      content = await getContent(message.id, message.id + ".m4a");
      e.content = content;
    } else if (message.type === "location") {
    } else if (message.type === "sticker") {
    }
  } else if (event.type === "follow") {
    getLinkToken(event.source.userId);
  } else if (event.type === "unfollow") {
  } else if (event.type === "join") {
  } else if (event.type === "leave") {
  } else if (event.type === "accountLink") {
    let nonce = event.link.nonce;
    let uid = event.source.userId;
    var conn = new jsforce.Connection();
    conn.login("alican.taner@curious-moose-y3sbg.com", "110490Alican3YUxXlZGxuYMQo9SXRHhSit9", function(err, res) {
      if (err) {
        return console.error(err);
      }
      conn.sobject("User").upsert(
        {
          Nonce__c: nonce,
          LineId__c: uid,
        },
        "Nonce__c",
        function(err, ret) {
          if (err || !ret.success) {
            return console.error(err, ret);
          }
        }
      );
    });
  } else if (event.type === "postback") {
    e.postback = event.postback;
  } else if (event.type === "beacon") {
    e.beacon = event.beacon;
  }
  return e;
};

const sendPushEvent = (body) => {
  const request = require("request");
  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer {" + process.env.LINE_CHANNEL_ACCESS_TOKEN + "}",
  };
  const options = {
    url: "https://api.line.me/v2/bot/message/push",
    // proxy: process.env.FIXIE_URL,
    headers: headers,
    json: true,
    body: body,
  };
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error || response.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
};

const sendMulticastEvent = (body) => {
  const request = require("request");
  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer {" + process.env.LINE_CHANNEL_ACCESS_TOKEN + "}",
  };
  const options = {
    url: "https://api.line.me/v2/bot/message/multicast",
    // proxy: process.env.FIXIE_URL,
    headers: headers,
    json: true,
    body: body,
  };
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error || response.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
};

const getLinkToken = (userId) => {
  const request = require("request");
  const headers = {
    Authorization: "Bearer {" + process.env.LINE_CHANNEL_ACCESS_TOKEN + "}",
  };
  const options = {
    url: "https://api.line.me/v2/bot/user/" + userId + "/linkToken",
    // proxy: process.env.FIXIE_URL,
    headers: headers,
  };
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error || response.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
        console.log(JSON.parse(body).linkToken);
        b = {
          to: userId,
          messages: [
            {
              type: "template",
              altText: "Account Link",
              template: {
                type: "buttons",
                text: "Account Link",
                actions: [
                  {
                    type: "uri",
                    label: "Account Link",
                    uri:
                      "https://taner2-developer-edition.ap16.force.com/AccountLink?linkToken=" +
                      JSON.parse(body).linkToken,
                  },
                ],
              },
            },
          ],
        };
        sendPushEvent(b).catch((error) => {
          console.log(error);
        });
      }
    });
  });
};

const getUserProfile = (userId) => {
  const request = require("request");
  const options = {
    url: "https://api.line.me/v2/bot/profile/" + userId,
    // proxy: process.env.FIXIE_URL,
    json: true,
    headers: {
      Authorization: "Bearer {" + process.env.LINE_CHANNEL_ACCESS_TOKEN + "}",
    },
  };
  return new Promise((resolve, reject) => {
    request.get(options, (error, response, body) => {
      if (error || response.statusCode != 200) {
        reject(body);
      } else {
        resolve(body);
      }
    });
  });
};

const getContent = (messageId, filename) => {
  const request = require("request");
  const options = {
    url: "https://api.line.me/v2/bot/message/" + messageId + "/content",
    // proxy: process.env.FIXIE_URL,
    json: true,
    headers: {
      Authorization: "Bearer {" + process.env.LINE_CHANNEL_ACCESS_TOKEN + "}",
      "Content-type": "application/json; charset=UTF-8",
    },
  };

  const data = [];
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error || response.statusCode != 200) {
        reject(error);
      } else {
        const fs = require("fs");
        fs.writeFile("./public/" + filename, Buffer.concat(data), "utf-8", (err) => {
          if (err) {
            reject(err);
          } else {
            const content = {
              type: response.headers["content-type"],
              length: response.headers["content-length"],
              filename: filename,
              data: Buffer.concat(data),
              url: process.env.BASE_URL + "/" + filename,
            };
            resolve(content);
          }
        });
      }
    }).on("data", (chunk) => {
      data.push(chunk);
    });
  });
};

const info = (message) => {
  console.log(message);
};
const debug = (message) => {
  //console.log(message);
};

var DB = require("../../db/mongodb");
var COLLECTION_NAME = "LINE";

/*
instance = {
  id: 'xxxxxxxxxxxxxx',
  profile: {
    displayName: 'LINE taro',
    userId: 'Uxxxxxxxxxxxxxx...',
    pictureUrl:'http://obs.line-apps.com/...',
    statusMessage:'Hello, LINE!''
  },
  event: {
    replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXCTA',
    timestamp: 1462629479859,
    source: {
    type: 'user',
    userId: 'U206d25c2ea6bd87c17655609a1c37cb8'
  },
}
*/
const initInstance = async (id, profile, event) => {
  var instance = { id: id, profile: profile, event: event };
  return (await DB.collection(COLLECTION_NAME).insertOne(instance)).ops[0];
};
const getInstance = (id) => {
  return DB.collection(COLLECTION_NAME)
    .find({ id: id })
    .limit(1)
    .next();
};
const updateInstance = async (id, event) => {
  return (
    await DB.collection(COLLECTION_NAME).findOneAndUpdate(
      { id: id },
      { $set: { event: event } },
      { returnOriginal: false }
    )
  ).value;
};
