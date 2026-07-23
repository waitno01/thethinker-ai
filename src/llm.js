import { config } from "./config.js";
import {
  filterContextMessages,
  extractCompletion,
  isUsableReply,
  isEcho,
  buildAgents,
  clipLine,
} from "./agents.js";
import { getOpenRouterClient } from "./openrouter.js";

/**
 * Optional guided prompt (off by default).
 * Free mode sends ONLY prior text — no names, no system prompt —
 * so models continue instead of analyzing a labeled dialogue.
 */
const MECHANICAL = `You are one voice in a chain of thoughts.
Continue the previous line in 1–3 short sentences.
Do not analyze, review, explain, or comment on the conversation.
Do not mention other speakers, letters, models, or that something was said.
No markdown, no lists, no headers.`;

const labels = () => buildAgents().map((a) => a.initial);

/** Raw text only — no callsigns (labels trigger "analyze this chat"). */
function formatRawContext(messages) {
  return messages.map((m) => clipLine(m.content)).join("\n");
}

function buildMessages(priorMessages, ownLabel) {
  const raw = formatRawContext(priorMessages).trim();
  if (!raw) throw new Error("EMPTY_CONTEXT");

  if (config.mechanicalPrompt) {
    return [
      { role: "system", content: MECHANICAL },
      { role: "user", content: raw },
      { role: "assistant", content: `${ownLabel}: ` },
    ];
  }

  return [{ role: "user", content: raw }];
}

function stopSequences(ownLabel) {
  return labels()
    .filter((l) => l !== ownLabel)
    .map((l) => `\n${l}:`);
}

function tokensForModel(model) {
  if (/gemini|deepseek/i.test(model)) return Math.max(config.completionTokens * 3, 256);
  return config.completionTokens;
}

export async function think({ conversationContext, model, ownInitial }) {
  const prior = filterContextMessages(conversationContext);
  if (!prior.length) return null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    const body = {
      model,
      messages: buildMessages(prior, ownInitial),
      temperature: attempt === 1 ? 1.0 : 0.9,
      max_tokens: tokensForModel(model),
    };

    let res;
    try {
      res = await getOpenRouterClient().chat.completions.create({
        ...body,
        stop: stopSequences(ownInitial),
      });
    } catch {
      res = await getOpenRouterClient().chat.completions.create(body);
    }

    const lastRaw = res.choices[0]?.message?.content?.trim() || "";
    if (!lastRaw) continue;

    const cleaned = extractCompletion(lastRaw, ownInitial, labels());
    if (isUsableReply(cleaned) && !isEcho(cleaned, prior)) return cleaned;
  }

  return null;
}
