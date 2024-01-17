const GreenlockExpress = require("greenlock-express");
const ExpressWS = require("express-ws");
const app = require('./main.js');

ExpressWS(app);

app.ws("/", ws =>
{
	const clientId = idCounter++;

	clients.set(clientId, ws);

	ws.on("close", () =>
	{
		clients.delete(clientId);
	});
});
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});