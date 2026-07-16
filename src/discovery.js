import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";
import {
  loadDiscoveriesIndex,
  saveDiscoveriesIndex,
  slugify,
} from "./store.js";

export function bookmarkDiscovery(discovery, meta) {
  const id = `${Date.now()}-${slugify(discovery.title)}`;
  const entry = {
    id,
    title: discovery.title,
    confidence: discovery.confidence,
    body: discovery.body,
    agent: meta.agent,
    model: meta.model,
    turn: meta.turn,
    source: meta.source || "agent",
    turns: meta.turns || [],
    createdAt: new Date().toISOString(),
  };

  const turnNote =
    entry.turns.length > 0
      ? ` · turns ${entry.turns.join(", ")}`
      : ` · turn ${entry.turn}`;

  const md = `# ${entry.title}

> Bookmarked by **${entry.agent}** (${entry.model}) · confidence ${entry.confidence}${turnNote}  
> ${entry.createdAt}

${entry.body}
`;

  writeFileSync(resolve(config.discoveriesDir, `${id}.md`), md);

  const index = loadDiscoveriesIndex();
  index.unshift(entry);
  saveDiscoveriesIndex(index);

  return entry;
}
