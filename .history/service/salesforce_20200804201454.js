const jsforce = require("jsforce");
let conn = new jsforce.Connection();

conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD, function(err) {
  if (err) {
    console.error(err);
    return;
  }
  console.log(conn.accessToken);
  console.log(conn.instanceUrl);
  return conn;
});

exports.conn = conn;
