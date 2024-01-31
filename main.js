// Express
const Express = require("express");
const ExpressSession = require("express-session");
const ExpressCompression = require("compression");
const SessionFileStore = require("session-file-store")(ExpressSession);

// Discord
const { Client, Events, GatewayIntentBits } = require("discord.js");

// Utils
const Path = require("path");
const QueryString = require("querystring");
const promisify = require("util").promisify;
const archiver = require("archiver");

// Our stuff
const Canvas = require("./canvas");

// Configs
const Config = require("./config.json");

require("dotenv").config();

/* TODO
 * - Auto update the page like vite on any changes
 * - Sync stuff like cooldown and ban
 * - Polling system where the client polls new pixels every few seconds
 * - Log out
 * - Automatic session expiry (though ttl already does that so ???)
 * - Move more stuff to config like redirect url, etc
 */

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.login(process.env.BOT_TOKEN);

client.once(Events.ClientReady, (c) => {
    console.log("Ready! Logged in as", c.user.tag);
    // Schedule message sending every 5 minutes
    setInterval(() => {
        const guildId = "959534476520730724"; // Replace with your guild ID
        const channelId = "1185767727005188166"; // Replace with your channel ID
        const canvasFolderPath = Path.join(__dirname, "canvas");
        const archive = archiver("zip", {
            zlib: { level: 9 }, // Set compression level to maximum
        });

        // Add all files in the canvas folder to the archive
        archive.directory(canvasFolderPath, false);

        // Finalize the archive
        archive.finalize();

        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                channel
                    .send({
                        files: [{ attachment: archive, name: "canvas.zip" }],
                    })
                    .then(() => {
                        console.log("Archive sent successfully");
                    })
                    .catch((error) => {
                        console.error("Failed to send archive:", error);
                    });
            }
        }
    }, 15 * 60 * 1000); // 15 minutes in milliseconds
});

/*
 * ===============================
 */

const app = Express();
// const port = 80;

/*
 * ===============================
 */

app.use(Express.static(Path.join(__dirname, "public")));
app.use(
    ExpressSession({
        store: new SessionFileStore({
            path: "./canvas/sessions",
            ttl: 7 * 24 * 60 * 60,
            retries: 0,
            encoder: (data) => JSON.stringify(data, null, "\t"),
        }),
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false,
    })
);
app.use(Express.json());

async function userInfo(req, res, next) {
    if (!req.session?.user) {
        return next();
    }

    req.user = req.session.user;

    try {
        req.member = await client.guilds.cache
            .get(Config.guild.id)
            .members.fetch(req.session.user.id);
    } catch (e) {}

    next();
}

/*
 * ===============================
 */

const clients = new Map();

const canvas = new Canvas().initialize({
    sizeX: 500,
    sizeY: 500,
    colors: [
        "#6d001a",
        "#be0039",
        "#ff4500",
        "#ffa800",
        "#ffd635",
        "#fff8b8",
        "#00a368",
        "#00cc78",
        "#7eed56",
        "#00756f",
        "#009eaa",
        "#00ccc0",
        "#2450a4",
        "#3690ea",
        "#51e9f4",
        "#493ac1",
        "#6a5cff",
        "#94b3ff",
        "#811e9f",
        "#b44ac0",
        "#e4abff",
        "#de107f",
        "#ff3881",
        "#ff99aa",
        "#6d482f",
        "#9c6926",
        "#ffb470",
        "#000000",
        "#515252",
        "#898d90",
        "#d4d7d9",
        "#ffffff",
    ],
});
const io = new Canvas.IO(canvas, "./canvas/current.hst");
const stats = new Canvas.Stats(canvas, io, () => clients.size);
io.read();
stats.startRecording(
    10 * 60 * 1000 /* 10 min */,
    24 * 60 * 60 * 1000 /* 24 hrs */
);

// day 2 colors
// const colors = [ "#ff4500", "#ffa800", "#ffd635", "#00a368", "#7eed56", "#2450a4", "#3690ea", "#51e9f4", "#811e9f", "#b44ac0", "#ff99aa", "#9c6926", "#000000", "#898d90", "#d4d7d9", "ffffff" ];

// day 3 colors
// const colors = [ "#be0039", "#ff4500", "#ffa800", "#ffd635", "#00a368", "#00cc78", "#7eed56", "#00756f", "#009eaa", "#2450a4", "#3690ea", "#51e9f4", "#493ac1", "#6a5cff", "#811e9f", "#b44ac0", "#ff3881", "#ff99aa", "#6d482f", "#9c6926", "#000000", "#898d90", "#d4d7d9", "#ffffff", ];

// day 4 colors
// const colors = [ "#6d001a", "#be0039", "#ff4500", "#ffa800", "#ffd635", "#fff8b8", "#00a368", "#00cc78", "#7eed56", "#00756f", "#009eaa", "#00ccc0", "#2450a4", "#3690ea", "#51e9f4", "#493ac1", "#6a5cff", "#94b3ff", "#811e9f", "#b44ac0", "#e4abff", "#de107f", "#ff3881", "#ff99aa", "#6d482f", "#9c6926", "#ffb470", "#000000", "#515252", "#898d90", "#d4d7d9", "#ffffff", ];

/*
 * ===============================
 */

const oauthRedirectUrl =
    "https://blueyplace-7jfhuhqmfa-uc.a.run.app/auth/discord/redirect";
const oauthScope = "identify";

app.get("/landing", function (req, res) {
    const currentTimestampSeconds = Math.floor(Date.now() / 1000);
    if (Config.canvasEnablesAt < currentTimestampSeconds) {
        res.redirect("/");
        return;
    }
    app.use(Express.static("public/images"));
    const watingPage = `
<!DOCTYPE html>
<html>
<head>
	<title>Starting Soon :D</title>
	<style>
		@font-face {
			font-family: 'CustomFont';
			src: url('./helloheadline.ttf') format('truetype');
		}
		body {
			background: url('./intro.jpg') no-repeat center center fixed;
			background-size: cover;
			font-family: "Open Sans", Arial, sans-serif;
			color: #ffffff;
			margin: 0;
			padding: 0;
		}
		  h1 {
			font-family: 'CustomFont', "Open Sans", Arial, sans-serif;
			text-align: center;
			margin: 32px;
		  }
		  p {
			text-align: center;
		  }
		  .countdown {
			font-family: 'CustomFont', "Open Sans", Arial, sans-serif;
			text-align: center;
			font-size: 36px;
		  }
		  .minimapinfo {
			text-align: center;
			font-size: 36px;
		  }
  
		  .button
		  {
			width: 300px;
			height: 100px;
		
			background-color: #E9EDEE;
			  border: 3px solid #111111;
			  display: flex;
			  justify-content: center;
			  align-items: center;
			  pointer-events: all;
			  box-shadow: 10px 10px #111111C0;
			  font-size: 1.5em;
			  font-weight: 700;
			  color: black;
		  }
		  
		  @media (hover: hover)
		  {
			  .button:hover
			  {
				  cursor: pointer;
				  filter: brightness(80%);
			  }
		  }
		  
		  .button:active
		  {
			  transform: scale(0.95);
		  }

		  .buttons {
			  text-align: center;
			  display: flex;
			  justify-content: center;
			  align-items: center;
			  gap: 20px;
			  margin-bottom: 32px;
		  }
	  </style>
</head>
<body>
    <h1>BlueyPlace opens in:</h1>
    <div id="countdown" class="countdown"></div>


	<div id="loading-screen" class="countdown">
		<img src="./dance.gif">
	</div>
	<div id="minimapinfo" class"countdown">
		  	<div class="buttons">
			  	<div class="button" onpointerup="clickA()">Overlay Instructions</div>
				<div class="button" onpointerup="clickB()">Join the Heeler House!</div>
		  	</div>
	</div>
	<script src="https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js"></script>
    <script>
        const targetTimestamp = 1706770800;
		const clickSound = new Howl({ src: [ "./click.mp3" ], volume: 0.2 });
		function clickA() {
			clickSound.play();
			location.href='/credits';
		}
		function clickB() {
			clickSound.play();
			location.href='https://discord.gg/blueyheeler';
		}

        function updateCountdown() {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const timeRemaining = targetTimestamp - currentTimestamp;

            if (timeRemaining <= 0) {
                document.getElementById('countdown').innerHTML = "BlueyPlace is now open! Refresh you page!";
				location.reload(); //Test Push E
            } else {
                const days = Math.floor(timeRemaining / (60 * 60 * 24));
                const hours = Math.floor((timeRemaining % (60 * 60 * 24)) / (60 * 60));
                const minutes = Math.floor((timeRemaining % (60 * 60)) / 60);
                const seconds = timeRemaining % 60;
				

                const countdownText = \`\${days}d \${hours}h \${minutes}m \${seconds}s\`;
                document.getElementById('countdown').innerHTML = '<strong>' + countdownText + '</strong>';
            }
        }
        updateCountdown();

        setInterval(updateCountdown, 1000);
    </script>
</body>
</html>
`;
    res.send(watingPage);
});

app.get("/credits", (req, res) => {
    app.use(Express.static("public/images"));
    app.use(Express.static("public/sounds"));
    const creditsPage = `
  <html lang="en">
  
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <title>Credits and Overlay</title>
	  <style>
	  		@font-face {
				font-family: 'CustomFont';
				src: url('./helloheadline.ttf') format('truetype');
			}
			body {
				background: url('./intro.jpg') no-repeat center center fixed;
				background-size: cover;
			  color: white;
			  font-family: "Open Sans", Arial, sans-serif;
			  margin: 0;
			  padding: 0;
		  }
  
		  .container {
			  max-width: 600px;
			  margin: 0 auto;
			  padding-bottom: 32px;
		  }

		  p {
			margin-top: 32px;
		  }
  
		  h1 {
				font-family: 'CustomFont', "Open Sans", Arial, sans-serif;
			  text-align: center;
			  margin: 32px;
		  }

		  .button
		  {
			width: 300px;
			height: 100px;
		
			background-color: #E9EDEE;
			  border: 3px solid #111111;
			  display: flex;
			  justify-content: center;
			  align-items: center;
			  pointer-events: all;
			  box-shadow: 10px 10px #111111C0;
			  font-size: 1.5em;
			  font-weight: 700;
			  color: #5a5a87;
		  }
		  
		  @media (hover: hover)
		  {
			  .button:hover
			  {
				  cursor: pointer;
				  filter: brightness(80%);
			  }
		  }
		  
		  .button:active
		  {
			  transform: scale(0.95);
		  }

		  .buttons {
			  margin-top: 32px;
			  text-align: center;
			  display: flex;
			  justify-content: center;
			  align-items: center;
			  gap: 20px;
		  }
	  </style>
  </head>
  <body>
	  <div class="container">
		  <h1>Credits + Overlay Instructions</h1>
		  <p>This is a fork of an open source canvas developed by Mercurial aka Mercy for Discord Server Manechat's 8th anniversary, with further edits by StarshinePony for r/Place faction BronyPlace. Adapted by Jalenluorion for The Heeler House's 10k member celebration!</p>
  
		  <div class="buttons">
			  <div class="button" onpointerup="clickA()">GitHub Repository by Mercy</div>
			  <div class="button" onpointerup="clickB()">Github Repository by Starshine</div>
		  </div>

		  <div class="buttons">
			  <div class="button" onpointerup="clickC()">Join Manechat!</div>
			  <div class="button" onpointerup="clickD()">Join Bronyplace!</div>
		  </div>

		  <p>Wanna use a template overlay? Download the script here! [FYI] > You need the ViolentMonkey extension for this to work!</p>
		  <div class="buttons">
			  <div class="button" onpointerup="clickE()">Download Script</div>
			  <div class="button" onpointerup="clickF()">Overlay Tutorial</div>
		  </div>
		  <div class="buttons">
		  	<div class="button" onpointerup="clickG()">Return to BlueyPlace</div>
			<div class="button" onpointerup="clickH()">Join the Heeler House!</div>
		  </div>
	  </div>
  </body>
  <script src="https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.min.js"></script>
  <script>
  const clickSound = new Howl({ src: [ "./click.mp3" ], volume: 0.2 });
  function clickA() {
	  clickSound.play();
	  location.href='https://github.com/Manechat/place.manechat.net';
  }
  function clickB() {
	  clickSound.play();
	  location.href='https://github.com/StarshinePony/mareplace';
  }
  function clickC() {
	  clickSound.play();
	  location.href='https://discord.gg/manechat';
	    }
	function clickD() {
		clickSound.play();
		location.href='https://discord.gg/bronyplace';
	}
	function clickE() {
		clickSound.play();
		location.href='https://github.com/osuplace/templateManager/raw/main/dist/templateManager.user.js';
	}	
	function clickF() {
		clickSound.play();
		location.href='https://docs.google.com/document/d/12WTiDcRo4P35zJvlgWX06MKVbitbDo3ehnF7mysFv4Y/edit';
	}
	function clickG() {
		clickSound.play();
		location.href='/';
	}
	function clickH() {
		clickSound.play();
		location.href='https://discord.gg/blueyheeler';
	}

  </script>
  </html>
  `;

    res.send(creditsPage);
});

// get /time returne boolean
app.get("/time", function (req, res) {
    const currentTimestampSeconds = Math.floor(Date.now() / 1000);
    if (Config.canvasEnablesAt < currentTimestampSeconds) {
        res.send("true");
        return;
    }
    res.send("false");
});

app.get("/auth/discord", (req, res) => {
    const query = QueryString.encode({
        client_id: process.env.CLIENT_ID,
        scope: oauthScope,
        redirect_uri: oauthRedirectUrl,
        response_type: "code",
        state: req.query.from,
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${query}`);
});

app.get("/auth/discord/redirect", async (req, res) => {
    const code = req.query.code;

    const redirectUrl = "/" + (req.query.state || "");

    if (!code) {
        return res.redirect(redirectUrl);
    }

    const authRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: "authorization_code",
            scope: oauthScope,
            redirect_uri: oauthRedirectUrl,
            code,
        }),
    });

    if (!authRes.ok) {
        return res.redirect(redirectUrl);
    }

    const auth = await authRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `${auth.token_type} ${auth.access_token}` },
    });

    if (!userRes.ok) {
        return res.redirect(redirectUrl);
    }

    await promisify(req.session.regenerate.bind(req.session))(); // TODO: Clean old sessions associated with this user/id
    req.session.user = await userRes.json();

    res.redirect(redirectUrl);
});

app.get("/initialize", userInfo, async (req, res) => {
    if (!req.user) {
        return res.json({
            loggedIn: false,
            banned: false,
            cooldown: 0,
            settings: canvas.settings,
        });
    }

    res.json({
        loggedIn: true,
        banned: isBanned(req.member),
        moderator: isMod(req.member),
        cooldown: canvas.users.get(req.user.id).cooldown,
        settings: canvas.settings,
    });
});

app.get("/canvas", ExpressCompression(), (req, res) => {
    res.contentType("application/octet-stream");
    res.send(canvas.pixels.data);
});

app.post("/place", userInfo, async (req, res) => {
    if (!req.member) {
        return res.status(401).send();
    }

    if (isBanned(req.member)) {
        return res.status(403).send();
    }

    const placed = canvas.place(
        +req.body.x,
        +req.body.y,
        +req.body.color,
        req.member.user.id,
        isMod(req.member)
    );
    res.send({ placed });
});

app.post("/placer", async (req, res) => {
    if (!canvas.isInBounds(+req.body.x, +req.body.y)) {
        return res.json({ username: "" });
    }

    const pixelInfo = canvas.info[+req.body.x][+req.body.y];

    if (!pixelInfo) {
        return res.json({ username: "" });
    }

    try {
        const member = await client.guilds.cache
            .get(Config.guild.id)
            .members.fetch(pixelInfo.userId.toString());

        if (member) {
            return res.json({
                username: member.nickname
                    ? member.nickname
                    : member.user.globalName,
            });
        }
    } catch (e) {}

    const user = await client.users.fetch(pixelInfo.userId.toString());

    if (!user) {
        return res.json({ username: "" });
    }

    res.json({ username: user.username });
});

/*
 * ===============================
 */

app.get("/stats-json", ExpressCompression(), userInfo, (req, res) => {
    const statsJson = {
        global: Object.assign(
            { userCount: clients.size, pixelCount: canvas.pixelEvents.length },
            stats.global
        ),
    };

    if (req.member) {
        statsJson.personal = stats.personal.get(req.member.user.id);
    }

    res.json(statsJson);
});

app.get("/datadump", (req, res) => {
    const canvasFolderPath = Path.join(__dirname, "canvas");
    const archive = archiver("zip", {
        zlib: { level: 9 }, // Set compression level to maximum
    });

    // Set the response headers for downloading the zip file
    res.attachment("canvas.zip");

    // Pipe the archive data directly to the response
    archive.pipe(res);

    // Add all files in the canvas folder to the archive
    archive.directory(canvasFolderPath, false);

    // Finalize the archive
    archive.finalize();
});

/*
 * ===============================
 */

function isBanned(member) {
    if (!member) {
        return true;
    }

    if (
        Config.guild.moderatorRoles.some((roleId) =>
            member.roles.cache.has(roleId)
        )
    ) {
        return false;
    }

    return (
        member.communication_disabled_until ||
        Config.guild.bannedRoles.some((roleId) =>
            member.roles.cache.has(roleId)
        )
    );
}
function isMod(member) {
    if (!member) {
        return false;
    }

    return Config.guild.moderatorRoles.some((roleId) =>
        member.roles.cache.has(roleId)
    );
}

/*
 * ===============================
 */

canvas.addListener("pixel", (x, y, color) => {
    console.log(
        "Pixel sent to " + clients.size + " - " + new Date().toString()
    );
    const buf = io.serializePixelWithoutTheOtherStuff(x, y, color);
    for (const socket of clients.values()) {
        socket.send(buf);
    }
});

/*
 * ===============================
 */

let idCounter = 0;

app.setUpSockets = () =>
    // TODO: THis is really ugly because of Greenlock
    {
        app.ws("/", (ws) => {
            const clientId = idCounter++;

            clients.set(clientId, ws);

            ws.on("close", () => {
                clients.delete(clientId);
            });
        });
    };

/*
app.listen(port, () =>
{
	console.log(`Example app listening on port ${port}`);
});
*/

module.exports = app;
