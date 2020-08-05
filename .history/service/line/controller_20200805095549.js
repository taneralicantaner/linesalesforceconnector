const SERVICE_NAME = require("../../common/constants").SERVICE_NAME;
const POSTBACK_DATA = require("../../common/constants").POSTBACK_DATA;
const ROUTER = require("../../common/constants").SERVICES.ROUTER;

const conn = require("../salesforce");

const accountLinkMessage =
  "Lineで物件に関する問合せするおよび最新のお知ら情報せを受け取るため、Lineアカウントとコミュニティアカウントの連携が必要です。" +
  "アカウントを連携するため、リンクを開いてコミュニティにログインしてください。\n" +
  process.env.SALESFORCE_ACCOUNT_LINK_VF;
const accountLinkSuccededMessage =
  "アカウントが連携されました。物件に関するご不明な点やお困りの点がございましたらLineで問合せしてください。";
const accountLinkFailedMessage = "アカウント連携は失敗しました。";

exports.processRequest = (req) => {
  info("LINE:processRequest:リクエストを受信");
  req.body.events.forEach(async (event) => {
    info("LINE:processRequest:イベントを処理");
    debug(event);
    debug("LINE:processRequest:id:");
    const id = event.source.userId || event.source.groupId || event.source.roomId;
    debug(id);

    debug("LINE:processRequest:instance:");
    let instance = await getInstance(id);
    debug(instance);
    if (instance) {
      // Event from exsisting user
      info("LINE:processRequest:既存LINEユーザー");
      debug("LINE:processRequest:profile:");
      const profile = await getUserProfile(id).catch((error) => console.error(error));
      debug("LINE:processRequest:instance:");
      if (profile) {
        instance = await updateInstance(id, profile, event);
      }
      debug(instance);
    } else {
      // Event from new user
      info("LINE:processRequest:新規LINEユーザー");
      debug("LINE:processRequest:profile:");
      const profile = await getUserProfile(id).catch((error) => console.log(error));
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
  await sendPushEvent(body).catch((error) => {
    console.log(error);
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
    if (message.type === "image") {
      content = await getContent(message.id, message.id + ".jpeg");
      e.content = content;
    } else if (message.type === "video") {
      content = await getContent(message.id, message.id + ".mp4");
      e.content = content;
    } else if (message.type === "audio") {
      content = await getContent(message.id, message.id + ".m4a");
      e.content = content;
    } else if (message.type === "text") {
    } else if (message.type === "location") {
    } else if (message.type === "sticker") {
    }
  } else if (event.type === "postback") {
    e.message = {
      type: "text",
      text: event.postback.data,
    };
  } else if (event.type === "follow") {
    linkToken = await getLinkToken(e).catch((err) => console.error(error));
    e.message = {
      type: "text",
      text: accountLinkMessage + linkToken,
    };
  } else if (event.type === "unfollow") {
    clearLineId(event);
    return;
  } else if (event.type === "accountLink") {
    if (event.link.result == "failed") {
      e.message = {
        type: "text",
        text: accountLinkFailedMessage,
      };
    } else {
      updateSalesforceUser(event);
      e.message = {
        type: "text",
        text: accountLinkSuccededMessage,
      };
    }
  } else if (event.type === "join") {
  } else if (event.type === "leave") {
  } else if (event.type === "beacon") {
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

const getLinkToken = (event) => {
  const request = require("request");
  const headers = {
    Authorization: "Bearer {" + process.env.LINE_CHANNEL_ACCESS_TOKEN + "}",
  };
  const options = {
    url: "https://api.line.me/v2/bot/user/" + event.origin.id + "/linkToken",
    headers: headers,
  };
  return new Promise((resolve, reject) => {
    request.post(options, (error, response, body) => {
      if (error || response.statusCode != 200) {
        reject(body);
      } else {
        let linkToken = JSON.parse(body).linkToken;
        resolve(linkToken);
      }
    });
  });
};

const updateSalesforceUser = (event) => {
  conn
    .sobject("User")
    .findOne({ Id: event.link.nonce })
    .execute(function(err, record) {
      if (err) {
        return console.error(err);
      } else if (!record) {
        return;
      }
      conn.sobject("Contact").update(
        {
          Id: record.ContactId,
          LineId__c: event.source.userId,
        },
        function(error, response) {
          if (error || !response.success) {
            return console.error(error, response);
          }
        }
      );
    });
};

const clearLineId = (event) => {
  conn
    .sobject("Contact")
    .findOne({ LineId__c: event.source.userId })
    .execute(function(err, record) {
      if (err) {
        return console.error(err);
      } else if (!record) {
        return;
      }
      conn.sobject("Contact").update(
        {
          Id: record.Id,
          LineId__c: null,
        },
        function(error, response) {
          if (error || !response.success) {
            return console.error(error, response);
          }
        }
      );
    });
};

const getUserProfile = (userId) => {
  const request = require("request");
  const options = {
    url: "https://api.line.me/v2/bot/profile/" + userId,
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
  console.log(message);
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
const updateInstance = async (id, profile, event) => {
  return (
    await DB.collection(COLLECTION_NAME).findOneAndUpdate(
      { id: id },
      { $set: { event: event, profile: profile } },
      { returnOriginal: false }
    )
  ).value;
};
