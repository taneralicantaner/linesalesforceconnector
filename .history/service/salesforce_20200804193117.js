const jsforce = require("jsforce");
let conn = new jsforce.Connection();

export default function{
  conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD, function(err) {
    if (err) {
      return console.error(err);
    }
    // Now you can get the access token and instance URL information.
    // Save them to establish connection next time.
    console.log(conn.accessToken);
    console.log(conn.instanceUrl);
  });
}
