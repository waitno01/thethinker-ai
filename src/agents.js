import { config } from "./config.js";

function shortModelName(model) {
  const tail = model.includes("/") ? model.split("/").pop() : model;
  return tail.length > 28 ? `${tail.slice(0, 28)}…` : tail;
}

function agentInitial(index) {
  return String.fromCharCode(65 + (index % 26));
}

export function buildAgents() {
  return config.agentModels.map((model, i) => ({
    id: `agent-${i + 1}`,
    initial: agentInitial(i),
    name: shortModelName(model),
    model,
  }));
}

const META_PATTERNS = [
  /your message (got|was|is)/i,
  /message got (cut off|interrupted|truncated)/i,
  /(got|was) interrupted/i,
  /incomplete (message|input|prompt)/i,
  /misunderstanding|mix-?up/i,
  /confusion in the conversation/i,
  /conversation flow/i,
  /fragment(ed|s)?/i,
  /corrupted (thread|conversation)/i,
  /overlapping (analysis|attempts|responses)/i,
  /technical (glitch|issue|error)/i,
  /i'?m here to help/i,
  /how can i assist/i,
  /how can i help/i,
  /could you (provide|clarify)/i,
  /clarification needed/i,
  /it seems (like )?(there was|you|there's)/i,
  /it looks like you/i,
  /it appears (that )?(there was|you|there's)/i,
  /meta-?(commentary|analysis|conversation|cognitive)/i,
  /recursive (meta|commentary|loop)/i,
  /self-?referential/i,
  /didn'?t go through correctly/i,
  /presenting a sequence of/i,
  /fabri(cated|cation)/i,
  /analysis of (the |this )?(conversation|responses|line)/i,
  /structured review/i,
  /step \d+:/i,
  /let'?s (break this down|carefully analyze|analyze)/i,
  /looking at the (conversation|fragments|responses)/i,
  /response quality/i,
  /web application/i,
  /defense-?in-?depth/i,
  /layered approach/i,
  /final answer is/i,
  /\\boxed\{/i,
  /thank you for your feedback/i,
  /i'?d note (this|that)/i,
  /poetic or metaphorical/i,
  /that line is so/i,
  /this (line|sentence) (evokes|suggests|is)/i,
  /opening line of/i,
  /this exchange/i,
  /feels like a (koan|riddle|fragment|poem)/i,
  /beautiful exchange/i,
  /#\s*\*\*/,
  /^#{1,3}\s/,
  /^[\?!…]+$/,
  /^(no, wait|based on the fragments|structured version of|to achieve this|layered approach)$/i,
  /^…/,
  /^,\s*which/i,
  /^(which|though|and|but) was\b/i,
  /the phrase/i,
  /this (poetic )?statement/i,
  /suggests that/i,
  /could be interpreted/i,
  /from a .* perspective/i,
  /in terms of/i,
  /implies that/i,
  /metaphorically/i,
  /deep exploration of/i,
  /interplay between/i,
  /be more specific/i,
  /question mark suggests/i,
  /breakdown of your/i,
  /thought experiment/i,
  /if [A-Z] (comes next|is continuing)/i,
  /here'?s a breakdown/i,
  /unfolding dialogue/i,
  /\(question \d+\)/i,
  /sounds like you'?re quoting/i,
  /great interpretation/i,
  /that is a great interpretation/i,
  /yes, that'?s a/i,
  /^absolutely!$/i,
  /challenges the traditional reading/i,
];

export function clipLine(text, max = config.maxContextLineChars) {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 20 ? cut.slice(0, sp) : cut).trim() + "…";
}

/** Only the last clean line — stops multi-voice "analyze letters A–F" mode. */
export function filterContextMessages(messages) {
  return messages
    .filter((m) => m.content && m.content !== "…" && m.content.length >= config.minReplyChars)
    .filter((m) => isUsableReply(m.content, { allowShort: true }))
    .slice(-Math.max(1, config.contextMessages));
}

export function isEcho(text, priorMessages) {
  const norm = text.replace(/\s+/g, " ").trim().toLowerCase();
  return priorMessages.some(
    (m) => m.content.replace(/\s+/g, " ").trim().toLowerCase() === norm,
  );
}

export function sanitizeReply(text, ownInitial) {
  let s = text.replace(/\s+/g, " ").trim();
  s = s.replace(/^#+\s*/g, "");
  s = s.replace(/\s*#+\s*/g, " ");
  s = s.replace(/^["']+|["']+$/g, "");
  s = s.replace(/^[A-Z]:\s*/, "");
  if (ownInitial) {
    const re = new RegExp(`^${ownInitial}\\s*[—–:-]\\s*`, "i");
    s = s.replace(re, "");
  }
  return s.trim();
}

export function extractCompletion(raw, ownInitial) {
  let s = sanitizeReply(raw, ownInitial);

  // Stop if model hallucinates the next speaker
  const next = s.search(/\s[A-Z]\s*[—–:-]\s/);
  if (next > 0) s = s.slice(0, next).trim();

  const sentence = s.match(/^[\s\S]*?[.!?](?=\s|$)/);
  s = sentence ? sentence[0].trim() : s.split(/\s+/).slice(0, 18).join(" ").trim();

  if (s.length > config.maxReplyChars) {
    const cut = s.slice(0, config.maxReplyChars);
    const sp = cut.lastIndexOf(" ");
    s = (sp > 20 ? cut.slice(0, sp) : cut).trim();
    if (!/[.!?]$/.test(s)) s += ".";
  }

  return s;
}

export function isUsableReply(text, { allowShort = false } = {}) {
  if (!text || text === "…") return false;
  if (/^[\s.…\-–—]+$/.test(text)) return false;
  if (text.length > config.maxReplyChars + 20) return false;
  if (!allowShort && text.length < config.minReplyChars) return false;
  if (!allowShort && !/[.!?]$/.test(text)) return false;
  if (/…$/.test(text)) return false;
  if (/^(\.{2,}|…)/.test(text)) return false;
  if (/['"(]$/.test(text) && !/[.!?]$/.test(text)) return false;
  if (/\($/.test(text) && !/[.!?]$/.test(text)) return false;
  if (META_PATTERNS.some((re) => re.test(text))) return false;
  if (/[<>{}\[\]`]/.test(text)) return false;
  if (/namespace |<\?php|<\|thought/i.test(text)) return false;
  return true;
}

/** Prior lines only — current speaker completes via assistant prefill. */
export function formatPriorLines(messages) {
  return messages
    .map((m) => `${m.initial} — ${clipLine(m.content)}`)
    .join("\n");
}

/** Full transcript for Observer (more lines, slightly longer clips). */
export function formatTranscript(messages) {
  return messages
    .filter((m) => m.content && m.content !== "…")
    .slice(-12)
    .map((m) => `${m.initial} — ${clipLine(m.content, 200)}`)
    .join("\n");
}

export function formatAgentLegend(agents) {
  return agents.map((a) => `${a.initial} = ${a.model}`).join(", ");
}
