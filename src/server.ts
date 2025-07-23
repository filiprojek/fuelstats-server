import http from "http";
import { app } from "./app";
import env from "./config/environment";
import { Succ } from "./services/globalService";
import connectDB from "./config/database";

const port: number = env.APP_PORT || 8080;
const hostname: string = env.APP_HOSTNAME || "localhost";
const server = http.createServer(app);

function runServer(): void {
	server.listen(port, hostname, () => {
		new Succ(200, `Server is listening on http://${hostname}:${port}`);
	});
}

async function start(): Promise<void> {
	console.log("Starting Fuel Stats API server...");
	// If no database configured, just start server
	if (!env.NORK.database) {
		runServer();
		return;
	}

	// Attempt to connect to the configured ORM
	const ok = await connectDB();
	if (ok) {
		runServer();
	} else {
		// Connection failed; exit with error code
		process.exit(1);
	}
}

start().catch((err) => {
	console.error(err);
	process.exit(1);
});
