const jsforce = require("jsforce");
let conn = new jsforce.Connection();

exports.login = () => {
  conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD, function(err, userInfo) {
    if (err) {
      return console.error(err);
    }
    // Now you can get the access token and instance URL information.
    // Save them to establish connection next time.
    console.log(conn.accessToken);
    console.log(conn.instanceUrl);
    return new jsforce.Connection({
      instanceUrl: "<your Salesforce server URL (e.g. https://na1.salesforce.com) is here>",
      accessToken: "<your Salesforrce OAuth2 access token is here>",
    });
  });
};
