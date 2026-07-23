import express from "express";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";
import { log } from "./log.js";
import {
  loadState,
  readAllMessages,
  loadDiscoveriesIndex,
  listDiscoveryFiles,
} from "./store.js";

const app = express();

app.get("/api/state", (_req, res) => {
  res.json(loadState());
});

app.get("/api/messages", (req, res) => {
  const limit = parseInt(req.query.limit || "100", 10);
  const all = readAllMessages();
  res.json(all.slice(-limit));
});

app.get("/api/discoveries", (_req, res) => {
  res.json(loadDiscoveriesIndex());
});

app.get("/api/discoveries/:id", (req, res) => {
  const path = resolve(config.discoveriesDir, `${req.params.id}.md`);
  if (!existsSync(path)) return res.status(404).json({ error: "not found" });
  res.type("text/markdown").send(readFileSync(path, "utf8"));
});

app.get("/", (_req, res) => {
  res.type("html").send(getDashboardHtml());
});

function getDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The Thinker — Discovery Review</title>
  <style>
    :root {
      --bg: #0d0f14;
      --panel: #151922;
      --border: #2a3142;
      --text: #e8eaef;
      --muted: #8b93a7;
      --accent: #7c9cff;
      --gold: #f0c14a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, #12151c, var(--bg));
    }
    h1 { margin: 0; font-size: 1.4rem; font-weight: 600; }
    .sub { color: var(--muted); font-size: 0.9rem; margin-top: 0.25rem; }
    main { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem 2rem 2rem; }
    @media (max-width: 900px) { main { grid-template-columns: 1fr; } }
    section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }
    section h2 {
      margin: 0;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
    }
    .scroll { max-height: 70vh; overflow-y: auto; padding: 0.5rem; }
    .discovery {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
    }
    .discovery:hover { background: #1a2030; }
    .discovery.active { background: #1e2640; border-left: 3px solid var(--gold); }
    .discovery h3 { margin: 0 0 0.25rem; font-size: 1rem; color: var(--gold); }
    .meta { font-size: 0.75rem; color: var(--muted); }
    .detail { padding: 1rem; white-space: pre-wrap; font-size: 0.95rem; }
    .msg {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.88rem;
    }
    .msg .who { color: var(--accent); font-weight: 600; margin-bottom: 0.25rem; }
    .msg .body { color: #c5cad6; }
    .status { padding: 0.5rem 1rem; font-size: 0.8rem; color: var(--muted); }
    .empty { padding: 2rem; text-align: center; color: var(--muted); }
  </style>
</head>
<body>
  <header>
    <h1>🧠 The Thinker</h1>
    <p class="sub">Live salon · discoveries bookmarked automatically</p>
    <p class="status" id="status">Loading…</p>
  </header>
  <main>
    <section>
      <h2>✦ Discoveries</h2>
      <div class="scroll" id="discoveries"><div class="empty">Waiting for sparks…</div></div>
    </section>
    <section>
      <h2 id="detail-title">Discovery detail</h2>
      <div class="scroll detail" id="detail">Select a discovery to read.</div>
    </section>
  </main>
  <section style="margin: 0 2rem 2rem;">
    <h2>💬 Recent discussion</h2>
    <div class="scroll" id="messages"><div class="empty">No messages yet.</div></div>
  </section>
  <script>
    async function refresh() {
      const [state, discoveries, messages] = await Promise.all([
        fetch("/api/state").then(r => r.json()),
        fetch("/api/discoveries").then(r => r.json()),
        fetch("/api/messages?limit=30").then(r => r.json()),
      ]);

      document.getElementById("status").textContent =
        \`Turn \${state.turn} · no preset topic · \${discoveries.length} discoveries\`;

      const dEl = document.getElementById("discoveries");
      if (!discoveries.length) {
        dEl.innerHTML = '<div class="empty">Waiting for sparks…</div>';
      } else {
        dEl.innerHTML = discoveries.map(d => \`
          <div class="discovery" data-id="\${d.id}">
            <h3>\${escapeHtml(d.title)}</h3>
            <div class="meta">\${escapeHtml(d.agent)} · conf \${d.confidence} · \${new Date(d.createdAt).toLocaleString()}</div>
            <div class="meta">\${escapeHtml(d.body.slice(0, 120))}…</div>
          </div>\`).join("");

        dEl.querySelectorAll(".discovery").forEach(el => {
          el.onclick = () => loadDetail(el.dataset.id, el);
        });
      }

      const mEl = document.getElementById("messages");
      if (!messages.length) {
        mEl.innerHTML = '<div class="empty">No messages yet.</div>';
      } else {
        mEl.innerHTML = messages.slice().reverse().map(m => \`
          <div class="msg">
            <div class="who">\${escapeHtml(m.initial || m.agent)} <span class="meta">turn \${m.turn}</span></div>
            <div class="body">\${escapeHtml(m.content)}</div>
          </div>\`).join("");
      }
    }

    async function loadDetail(id, el) {
      document.querySelectorAll(".discovery").forEach(d => d.classList.remove("active"));
      if (el) el.classList.add("active");
      const text = await fetch("/api/discoveries/" + id).then(r => r.text());
      document.getElementById("detail").textContent = text;
    }

    function escapeHtml(s) {
      return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    refresh();
    setInterval(refresh, 8000);
  </script>
</body>
</html>`;
}

export function startServer() {
  app.listen(config.port, () => {
    log.dashboard(`http://localhost:${config.port}`);
  });
}

// Standalone: node src/server.js
if (process.argv[1]?.endsWith("server.js")) {
  startServer();
}
