const GreenlockExpress = require("greenlock-express");
const ExpressWS = require("express-ws");
const app = require('./main.js');

ExpressWS(app);
app.setUpSockets();
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});