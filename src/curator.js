import { formatTranscript } from "./agents.js";
import { complete } from "./openrouter.js";
import { config } from "./config.js";
import { bookmarkDiscovery } from "./discovery.js";
import { loadDiscoveriesIndex } from "./store.js";

const SYSTEM = `You are an external observer watching a conversation between AI minds. You never speak in the conversation — you only watch.

After each new message, decide if anything in the transcript is genuinely worth saving: a novel insight, surprising connection, deep question, or idea with real weight.

You must respond with a single JSON object and nothing else.

If nothing qualifies:
{"bookmarks":[]}

If something qualifies:
{"bookmarks":[{"title":"Short title","body":"What was said and why it matters.","confidence":0.85}]}

Rules:
- Be very selective. Zero bookmarks is normal and preferred.
- Ignore greetings, filler, meta chatter, and obvious statements.
- Speakers are anonymous letters (A, B, C…) — not AI model names.
- Do not repeat topics already listed under "Existing bookmarks".`;

function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function parseCuratorJson(text) {
  if (!text?.trim()) return { bookmarks: [] };

  const candidates = [text.trim()];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1].trim());

  const extracted = extractFirstJsonObject(text);
  if (extracted) candidates.push(extracted);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // try next candidate
    }
  }

  return { bookmarks: [] };
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isDuplicateTitle(title, existing) {
  const norm = normalizeTitle(title);
  return existing.some((d) => normalizeTitle(d.title) === norm);
}

export async function reviewTranscript(messages) {
  if (!messages.length) return [];

  try {
    const existing = loadDiscoveriesIndex();
    const existingSummary =
      existing.length === 0
        ? "(none yet)"
        : existing
            .slice(0, 20)
            .map((d) => `- ${d.title}`)
            .join("\n");

    const raw = await complete({
      model: config.curatorModel,
      maxTokens: config.curatorMaxTokens,
      temperature: 0.2,
      jsonMode: true,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Existing bookmarks:\n${existingSummary}\n\nTranscript:\n${formatTranscript(messages)}`,
        },
      ],
    });

    const parsed = parseCuratorJson(raw);
    if (!raw.includes('"bookmarks"') && parsed.bookmarks?.length === 0 && raw.length > 0) {
      console.warn("[Observer] unparseable response, skipping:", raw.slice(0, 120));
    }

    const bookmarks = Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [];
    const saved = [];

    for (const b of bookmarks) {
      if (!b?.title || !b?.body) continue;
      const title = String(b.title).trim();
      if (isDuplicateTitle(title, existing) || isDuplicateTitle(title, saved)) continue;

      const entry = bookmarkDiscovery(
        {
          title,
          body: String(b.body).trim(),
          confidence: Math.min(1, Math.max(0, parseFloat(b.confidence) || 0.5)),
        },
        {
          agent: "Observer",
          model: config.curatorModel,
          turn: messages.at(-1)?.turn ?? 0,
          source: "curator",
        },
      );
      saved.push(entry);
      existing.unshift(entry);
    }

    return saved;
  } catch (err) {
    console.warn("[Observer] review failed:", err.message);
    return [];
  }
}
