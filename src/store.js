import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";

function ensureDirs() {
  mkdirSync(config.dataDir, { recursive: true });
  mkdirSync(config.discoveriesDir, { recursive: true });
}

const statePath = () => resolve(config.dataDir, "state.json");
const transcriptPath = () => resolve(config.dataDir, "transcript.jsonl");
const discoveriesIndexPath = () => resolve(config.dataDir, "discoveries.json");

const emptyState = () => ({ turn: 0, agentIndex: 0, startedAt: null });

export function loadState() {
  ensureDirs();
  if (!existsSync(statePath())) return emptyState();
  return JSON.parse(readFileSync(statePath(), "utf8"));
}

export function saveState(state) {
  ensureDirs();
  writeFileSync(statePath(), JSON.stringify(state, null, 2));
}

export function appendMessage(msg) {
  ensureDirs();
  appendFileSync(transcriptPath(), JSON.stringify(msg) + "\n");
}

export function readRecentMessages(limit) {
  if (!existsSync(transcriptPath())) return [];
  const lines = readFileSync(transcriptPath(), "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(-limit).map((l) => JSON.parse(l));
}

export function readAllMessages() {
  if (!existsSync(transcriptPath())) return [];
  return readFileSync(transcriptPath(), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

export function loadDiscoveriesIndex() {
  ensureDirs();
  if (!existsSync(discoveriesIndexPath())) return [];
  return JSON.parse(readFileSync(discoveriesIndexPath(), "utf8"));
}

export function saveDiscoveriesIndex(list) {
  ensureDirs();
  writeFileSync(discoveriesIndexPath(), JSON.stringify(list, null, 2));
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function listDiscoveryFiles() {
  ensureDirs();
  return readdirSync(config.discoveriesDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();
}

/** Wipe conversation, discoveries, and reset orchestrator state. */
export function wipeAll() {
  ensureDirs();
  writeFileSync(transcriptPath(), "");
  writeFileSync(discoveriesIndexPath(), "[]");
  writeFileSync(statePath(), JSON.stringify(emptyState(), null, 2));
  for (const f of readdirSync(config.discoveriesDir)) {
    if (f.endsWith(".md")) unlinkSync(resolve(config.discoveriesDir, f));
  }
}
