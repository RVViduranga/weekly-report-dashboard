import { AppError } from "./errors";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * A free model answers in two to three seconds. Thirty is a ceiling, not an
 * expectation - it exists so a hung request fails as a 504 instead of holding
 * an Express handler open forever.
 */
const TIMEOUT_MS = 30_000;

/**
 * Tried in order, and the reason there is more than one: a `:free` model runs
 * on a pool shared by every free user of that provider, so it answers 429
 * "rate-limited upstream" at busy moments even when this account has used
 * nothing at all. Different models sit behind different providers, so the
 * second is usually free when the first is not.
 */
const DEFAULT_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
];

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** The shape we actually read back. OpenRouter returns more; none of it is used. */
type ChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

type Attempt =
  | { ok: true; text: string }
  | { ok: false; status: number; retryable: boolean };

function configuredModels(): string[] {
  const configured = process.env.OPENROUTER_MODELS;

  if (!configured) return DEFAULT_MODELS;

  const models = configured
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model.length > 0);

  return models.length > 0 ? models : DEFAULT_MODELS;
}

async function askModel(
  model: string,
  messages: ChatMessage[],
  apiKey: string
): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal,
    });
  } catch {
    // A timeout is worth retrying on another model; the request never landed.
    return { ok: false, status: 504, retryable: true };
  } finally {
    clearTimeout(timer);
  }

  const body = (await response.json()) as ChatResponse;

  if (!response.ok) {
    // The upstream message can name the model and the account, so it is logged
    // rather than returned to the browser.
    console.error("OpenRouter", model, response.status, body.error?.message);

    // 429 is a busy shared pool and 5xx is the provider being down: both mean
    // "ask someone else". A 400 or 401 is our own request being wrong, and
    // repeating it against another model would only waste the daily quota.
    return {
      ok: false,
      status: response.status,
      retryable: response.status === 429 || response.status >= 500,
    };
  }

  const reply = body.choices?.[0]?.message?.content;

  if (typeof reply !== "string" || reply.trim() === "") {
    return { ok: false, status: 502, retryable: true };
  }

  return { ok: true, text: reply.trim() };
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Missing configuration disables this one feature rather than breaking the
  // app, so the repository still runs end to end without an API key.
  if (!apiKey) {
    throw new AppError(503, "The assistant is not configured on this server");
  }

  let lastStatus = 502;

  for (const model of configuredModels()) {
    const attempt = await askModel(model, messages, apiKey);

    if (attempt.ok) return attempt.text;

    lastStatus = attempt.status;
    if (!attempt.retryable) break;
  }

  throw new AppError(
    lastStatus === 429 ? 429 : 502,
    lastStatus === 429
      ? "Every free model is busy at the moment. Try again in a minute."
      : "The assistant is unavailable right now"
  );
}
