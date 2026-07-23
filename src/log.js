/** Tiny ANSI logger — no deps. Colors disable when stdout isn't a TTY. */

const useColor = process.stdout.isTTY !== false && process.env.NO_COLOR == null;

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  italic: "\x1b[3m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  brightCyan: "\x1b[96m",
  brightYellow: "\x1b[93m",
  brightMagenta: "\x1b[95m",
  brightGreen: "\x1b[92m",
  brightBlue: "\x1b[94m",
  brightRed: "\x1b[91m",
  brightWhite: "\x1b[97m",
};

function paint(code, text) {
  if (!useColor) return String(text);
  return `${code}${text}${c.reset}`;
}

const AGENT_COLORS = [
  c.brightCyan,
  c.brightMagenta,
  c.brightYellow,
  c.brightGreen,
  c.brightBlue,
  c.brightRed,
  c.cyan,
  c.magenta,
];

export function agentColor(initial) {
  if (!initial || initial === "?") return c.gray;
  let hash = 0;
  for (const ch of String(initial)) hash = (hash + ch.charCodeAt(0) * 17) % AGENT_COLORS.length;
  return AGENT_COLORS[hash];
}

function stamp() {
  return paint(c.dim, new Date().toISOString().slice(11, 19));
}

export const log = {
  info(msg) {
    console.log(`${stamp()}  ${paint(c.blue, "·")} ${msg}`);
  },
  thinking(initial, name) {
    const col = agentColor(initial);
    console.log(
      `${stamp()}  ${paint(c.bold + col, initial)} ${paint(c.dim, "·")} ${paint(c.dim, name)} ${paint(c.italic + c.gray, "thinking…")}`,
    );
  },
  speak(initial, content) {
    const col = agentColor(initial);
    console.log(
      `${stamp()}  ${paint(c.bold + col, initial)} ${paint(c.dim, "—")} ${paint(c.white, content)}`,
    );
  },
  skip(initial, reason) {
    const col = agentColor(initial);
    console.log(
      `${stamp()}  ${paint(c.bold + col, initial)} ${paint(c.dim, "—")} ${paint(c.yellow, `skipped · ${reason}`)}`,
    );
  },
  observer(model) {
    console.log(
      `${stamp()}  ${paint(c.bold + c.magenta, "👁")}  ${paint(c.magenta, "Observer")} ${paint(c.dim, `(${model}) reviewing…`)}`,
    );
  },
  discovery(title, path) {
    console.log(
      `${stamp()}  ${paint(c.bold + c.brightYellow, "✦")}  ${paint(c.brightYellow, "DISCOVERY")} ${paint(c.bold, `"${title}"`)}`,
    );
    console.log(`${stamp()}     ${paint(c.dim, "→")} ${paint(c.gray, path)}`);
  },
  error(msg) {
    console.log(`${stamp()}  ${paint(c.bold + c.red, "✗")}  ${paint(c.red, msg)}`);
  },
  banner({ agentCount, turnDelayMs, models }) {
    const line = "─".repeat(44);
    const modelLine = models.length > 40 ? `${models.slice(0, 40)}…` : models;
    console.log("");
    console.log(paint(c.cyan, `  ╭${line}╮`));
    console.log(
      paint(c.cyan, "  │") +
        paint(c.bold + c.brightWhite, "           🧠  T H E  T H I N K E R          ") +
        paint(c.cyan, "│"),
    );
    console.log(
      paint(c.cyan, "  │") +
        paint(c.dim, `  ${agentCount} agents · OpenRouter · ${turnDelayMs}ms/turn`.padEnd(44)) +
        paint(c.cyan, "│"),
    );
    console.log(
      paint(c.cyan, "  │") +
        paint(c.gray, `  ${modelLine}`.padEnd(44)) +
        paint(c.cyan, "│"),
    );
    console.log(paint(c.cyan, `  ╰${line}╯`));
    console.log("");
  },
  dashboard(url) {
    console.log(`${stamp()}  ${paint(c.green, "●")}  ${paint(c.dim, "dashboard")} ${paint(c.brightCyan, url)}`);
  },
  shutdown() {
    console.log(`\n${stamp()}  ${paint(c.yellow, "■")}  ${paint(c.dim, "shutting down…")}`);
  },
  paint,
  c,
};
