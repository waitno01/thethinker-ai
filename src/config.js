import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DEFAULT_MODELS = [
  "google/gemini-3.5-flash",
  "anthropic/claude-haiku-4.5",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-3.2-24b-instruct",
  "deepseek/deepseek-v3.2",
  "openai/gpt-4o-mini",
  "qwen/qwen-2.5-72b-instruct",
  "google/gemma-2-9b-it",
];

function loadDotEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

function parseModels(count) {
  const fromEnv = process.env.THINKER_MODELS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pool = fromEnv?.length ? fromEnv : DEFAULT_MODELS;
  const models = [];
  for (let i = 0; i < count; i++) models.push(pool[i % pool.length]);
  return models;
}

const agentCount = Math.max(2, parseInt(process.env.THINKER_AGENT_COUNT || "6", 10));

export const config = {
  root,
  dataDir: resolve(root, "data"),
  discoveriesDir: resolve(root, "data", "discoveries"),
  openrouterKey: process.env.OPENROUTER_API_KEY,
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  agentModels: parseModels(agentCount),
  agentCount,
  turnDelayMs: parseInt(process.env.THINKER_TURN_DELAY_MS || "15000", 10),
  contextMessages: parseInt(process.env.THINKER_CONTEXT_MESSAGES || "1", 10),
  maxTokens: parseInt(process.env.THINKER_MAX_TOKENS || "1024", 10),
  completionTokens: parseInt(process.env.THINKER_COMPLETION_TOKENS || "35", 10),
  maxReplyChars: parseInt(process.env.THINKER_MAX_REPLY_CHARS || "140", 10),
  maxContextLineChars: parseInt(process.env.THINKER_MAX_CONTEXT_LINE_CHARS || "120", 10),
  maxRetries: parseInt(process.env.THINKER_MAX_RETRIES || "4", 10),
  minReplyChars: parseInt(process.env.THINKER_MIN_REPLY_CHARS || "10", 10),
  mechanicalPrompt: process.env.THINKER_MECHANICAL_PROMPT !== "false",
  port: parseInt(process.env.THINKER_PORT || "3847", 10),
  curatorModel: process.env.THINKER_CURATOR_MODEL || "openai/gpt-4o-mini",
  curatorMaxTokens: parseInt(process.env.THINKER_CURATOR_MAX_TOKENS || "512", 10),
  curatorContextMessages: parseInt(process.env.THINKER_CURATOR_CONTEXT || "12", 10),
  curatorEnabled: process.env.THINKER_CURATOR_ENABLED !== "false",
};
