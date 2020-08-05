const jsforce = require("jsforce");
let conn = new jsforce.Connection();

conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD, function(err) {
  if (err) {
    return console.error(err);
  }
  console.log("Logged into Salesforce");
  console.log(conn.accessToken);
  console.log(conn.instanceUrl);
});

module.exports = conn;
