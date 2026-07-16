import OpenAI from "openai";
import { config } from "./config.js";

let client;

export function getOpenRouterClient() {
  if (!client) {
    if (!config.openrouterKey) {
      throw new Error("OPENROUTER_API_KEY is required (set in env or .env)");
    }
    client = new OpenAI({
      apiKey: config.openrouterKey,
      baseURL: config.openrouterBaseUrl,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3847",
        "X-Title": "The Thinker",
      },
    });
  }
  return client;
}

export async function complete({
  model,
  messages,
  maxTokens,
  temperature = 0.3,
  jsonMode = false,
}) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await getOpenRouterClient().chat.completions.create(body);
  return res.choices[0]?.message?.content?.trim() || "";
}
