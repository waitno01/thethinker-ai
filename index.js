import { runLoop, stop } from "./src/orchestrator.js";
import { startServer } from "./src/server.js";
import { config } from "./src/config.js";

const once = process.argv.includes("--once");

const modelList = config.agentModels.map((m) => m.split("/").pop()).join(", ");

console.log(`
╔══════════════════════════════════════════╗
║           🧠  T H E  T H I N K E R       ║
║  ${config.agentCount} agents · OpenRouter · ${config.turnDelayMs}ms/turn
║  ${modelList.slice(0, 42)}${modelList.length > 42 ? "…" : ""}
╚══════════════════════════════════════════╝
`);

startServer();

process.on("SIGINT", () => {
  console.log("\nShutting down…");
  stop();
  process.exit(0);
});

runLoop({ once }).catch((err) => {
  console.error(err);
  process.exit(1);
});
