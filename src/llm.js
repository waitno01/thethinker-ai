import { config } from "./config.js";
import {
  filterContextMessages,
  formatPriorLines,
  extractCompletion,
  isUsableReply,
  isEcho,
} from "./agents.js";
import { getOpenRouterClient } from "./openrouter.js";

const MECHANICAL = `You are one voice in a chain of thoughts.
Continue the previous line in 1–3 short sentences.
Do not analyze, review, explain, or comment on the conversation.
Do not mention other speakers, letters, models, or that something was said.
No markdown, no lists, no headers.`;

function buildMessages(priorMessages, ownInitial) {
  const lines = formatPriorLines(priorMessages);
  const userContent = lines.length > 0 ? lines : "? — …";

  const messages = [];
  if (config.mechanicalPrompt) {
    messages.push({ role: "system", content: MECHANICAL });
  }
  messages.push(
    { role: "user", content: userContent },
    { role: "assistant", content: `${ownInitial} — ` },
  );
  return messages;
}

export async function think({ conversationContext, model, ownInitial }) {
  const prior = filterContextMessages(conversationContext);
  let lastRaw = "";

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    const res = await getOpenRouterClient().chat.completions.create({
      model,
      messages: buildMessages(prior, ownInitial),
      temperature: attempt === 1 ? 0.95 : 0.85,
      max_tokens: config.completionTokens,
      stop: ["\n", "A —", "B —", "C —", "D —", "E —", "F —", "? —"],
    });

    lastRaw = res.choices[0]?.message?.content?.trim() || "";
    const cleaned = extractCompletion(lastRaw, ownInitial);

    if (isUsableReply(cleaned) && !isEcho(cleaned, prior)) return cleaned;
  }

  return null;
}
