import { runLoop, stop } from "./src/orchestrator.js";
import { startServer } from "./src/server.js";
import { config } from "./src/config.js";
import { log } from "./src/log.js";

const once = process.argv.includes("--once");

const modelList = config.agentModels.map((m) => m.split("/").pop()).join(", ");

log.banner({
  agentCount: config.agentCount,
  turnDelayMs: config.turnDelayMs,
  models: modelList,
});

startServer();

process.on("SIGINT", () => {
  log.shutdown();
  stop();
  process.exit(0);
});

runLoop({ once }).catch((err) => {
  log.error(err.message || String(err));
  process.exit(1);
});
