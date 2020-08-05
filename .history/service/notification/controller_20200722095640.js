exports.processRequest = (req) => {
  info("NOTIFICATION:processRequest:リクエストを受信");
  req.body.forEach(async (b) => {
    sendMulticastEvent(JSON.parse(b)).catch((error) => {
      console.log(error);
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

const info = (message) => {
  console.log(message);
};
const debug = (message) => {
  console.log(message);
};
