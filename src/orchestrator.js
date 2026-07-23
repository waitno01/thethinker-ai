import { config } from "./config.js";
import { buildAgents, formatAgentLegend } from "./agents.js";
import { think } from "./llm.js";
import { reviewTranscript } from "./curator.js";
import { randomOpener } from "./openers.js";
import { log } from "./log.js";
import {
  loadState,
  saveState,
  appendMessage,
  readRecentMessages,
} from "./store.js";

const agents = buildAgents();
let running = true;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureOpener(state) {
  if (state.turn !== 0 || readRecentMessages(1).length > 0) return;
  const opener = {
    id: `seed-${Date.now()}`,
    turn: -1,
    initial: "?",
    agent: "seed",
    agentId: "seed",
    model: "local",
    content: randomOpener(),
    synthetic: true,
    at: new Date().toISOString(),
  };
  appendMessage(opener);
  log.speak("?", opener.content);
}

export async function runTurn(state) {
  const agent = agents[state.agentIndex % agents.length];
  const recent = readRecentMessages(config.contextMessages);

  log.thinking(agent.initial, agent.name);

  const content = await think({
    conversationContext: recent,
    model: agent.model,
    ownInitial: agent.initial,
  });

  if (!content) {
    log.skip(agent.initial, "meta or cut off");
    state.turn += 1;
    state.agentIndex = (state.agentIndex + 1) % agents.length;
    saveState(state);
    return null;
  }

  const message = {
    id: `${Date.now()}-${agent.id}`,
    turn: state.turn,
    initial: agent.initial,
    agent: agent.name,
    agentId: agent.id,
    model: agent.model,
    content,
    at: new Date().toISOString(),
  };

  appendMessage(message);
  log.speak(agent.initial, content);

  state.turn += 1;
  state.agentIndex = (state.agentIndex + 1) % agents.length;
  saveState(state);

  if (config.curatorEnabled) {
    const window = readRecentMessages(config.curatorContextMessages);
    log.observer(config.curatorModel);
    try {
      const saved = await reviewTranscript(window);
      for (const d of saved) {
        log.discovery(d.title, `data/discoveries/${d.id}.md`);
      }
    } catch (err) {
      log.error(`Observer: ${err.message}`);
    }
  }

  return message;
}

export async function runLoop({ once = false } = {}) {
  const state = loadState();
  if (state.turn === 0 && !state.startedAt) {
    state.startedAt = new Date().toISOString();
    log.info(`Starting salon — ${agents.length} minds`);
    log.info(`Legend: ${formatAgentLegend(agents)}`);
    if (config.curatorEnabled) {
      log.info(`Observer → ${config.curatorModel} (monitor only)`);
    }
    saveState(state);
  } else {
    log.info(`Resuming salon — turn ${state.turn}`);
  }

  while (running) {
    try {
      ensureOpener(state);
      await runTurn(state);
    } catch (err) {
      log.error(err.message);
      await sleep(Math.min(config.turnDelayMs * 2, 60000));
    }

    if (once) break;
    await sleep(config.turnDelayMs);
  }
}

export function stop() {
  running = false;
}
