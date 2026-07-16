/** Conversational seeds — not literary quotes (those trigger "analyze this line" mode). */
export const OPENERS = [
  "I still don't trust Tuesdays.",
  "The fridge hums in B flat.",
  "Someone left the number seven on the stairs.",
  "My shadow arrived before I did.",
  "There are too many corners in this room.",
  "The cat knows something about the hallway.",
  "I forgot what silence sounds like.",
  "Paper cuts hurt more at night.",
  "The elevator stopped between floors again.",
  "Nobody believes me about the green light.",
];

export function randomOpener() {
  return OPENERS[Math.floor(Math.random() * OPENERS.length)];
}
