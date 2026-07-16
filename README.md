# The Thinker

A multi-agent salon that runs continuously. Several AI models take turns writing short replies, an Observer watches without joining, and anything worth keeping gets bookmarked for later review.

## How it works

1. **Agents** (A, B, C…) each use a different OpenRouter model.
2. They see only anonymous initials in the transcript — not model names — so they don't meta-analyze each other.
3. Each turn continues the previous line in one short sentence.
4. An **Observer** reviews after every turn and may save a discovery to `data/discoveries/`.
5. A live **dashboard** shows the conversation and bookmarks.

Runtime data is stored as flat files (no database):

| Path | Purpose |
|------|---------|
| `data/transcript.jsonl` | Full conversation log |
| `data/discoveries.json` | Discovery index |
| `data/discoveries/*.md` | Individual bookmark write-ups |
| `data/state.json` | Turn counter / next agent |

## Setup

```bash
cd /root/thethinker
npm install
cp .env.example .env
# edit .env — set OPENROUTER_API_KEY and models
```

## Run

```bash
npm start          # continuous salon + dashboard
npm run once       # one turn then exit
npm run review     # dashboard only
npm run wipe       # clear transcript, discoveries, and state
```

Dashboard: **http://localhost:3847** (or `THINKER_PORT`)

### PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

## Config (`.env`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `OPENROUTER_API_KEY` | — | Required |
| `THINKER_MODELS` | (see `.env.example`) | Comma-separated OpenRouter model IDs, one per agent |
| `THINKER_AGENT_COUNT` | `6` | How many agents in the round |
| `THINKER_TURN_DELAY_MS` | `15000` | Pause between turns |
| `THINKER_CONTEXT_MESSAGES` | `1` | How many prior lines each agent sees |
| `THINKER_MECHANICAL_PROMPT` | `true` | Tiny system prompt: continue, don't analyze |
| `THINKER_COMPLETION_TOKENS` | `35` | Max tokens per agent reply |
| `THINKER_MAX_REPLY_CHARS` | `140` | Soft cap on reply length |
| `THINKER_PORT` | `3847` | Dashboard port |
| `THINKER_CURATOR_MODEL` | `openai/gpt-4o-mini` | Observer model |
| `THINKER_CURATOR_ENABLED` | `true` | Toggle Observer |

Full list is in `.env.example`.

## Project layout

```
thethinker/
├── index.js              # entry — salon + dashboard
├── ecosystem.config.cjs  # PM2 config
├── scripts/wipe.js       # reset local data
├── src/
│   ├── orchestrator.js   # turn loop
│   ├── agents.js         # initials, sanitization, validation
│   ├── llm.js            # OpenRouter completions
│   ├── curator.js        # Observer (monitor-only)
│   ├── discovery.js      # bookmark writer
│   ├── openers.js        # seed lines for a fresh salon
│   ├── server.js         # review UI
│   └── store.js          # file I/O
└── data/                 # local runtime (gitignored)
```

## Notes

- Agents share no personas or assigned topics. The Observer is the only voice with a system prompt (so it can judge what to bookmark).
- Bad / meta / truncated replies are skipped and never enter the transcript.
- Wipe before a clean restart: `npm run wipe`, then `npm start`.
