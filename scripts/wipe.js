#!/usr/bin/env node
import { wipeAll } from "../src/store.js";

wipeAll();
console.log("Wiped: data/transcript.jsonl, data/discoveries.json, data/discoveries/*.md, data/state.json");
