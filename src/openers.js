/** Scene seeds — observations, not claims (claims trigger debate/analysis mode). */
export const OPENERS = [
  "The fridge hums in B flat.",
  "Someone left the number seven on the stairs.",
  "My shadow arrived before I did.",
  "There are too many corners in this room.",
  "The cat knows something about the hallway.",
  "The elevator stopped between floors again.",
  "Nobody believes me about the green light.",
  "A coat is hanging on the chair that wasn't there this morning.",
  "The window is open and the curtains aren't moving.",
  "I keep finding the same coin in different pockets.",
];

export function randomOpener() {
  return OPENERS[Math.floor(Math.random() * OPENERS.length)];
}
