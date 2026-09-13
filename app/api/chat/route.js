export const runtime = "nodejs";

const MAX_MESSAGES = 40;
const MAX_TEXT = 12000;
const MAX_IMAGE_BYTES = 6_000_000;

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_VISION_MODEL = "qwen/qwen3.6-27b";

function detectMood(text = "") {
  const t = String(text).toLowerCase();

  if (/(haha|lol|happy|seronok|best|gembira|kelakar|syok)/.test(t)) {
    return "happy";
  }

  if (/(marah|geram|bengang|upset|sad|sedih|stress|frust)/.test(t)) {
    return "upset";
  }

  if (/(hehe|gurau|nakal|tease|mengusik|lawak)/.test(t)) {
    return "playful";
  }

  if (/(risau|jaga|care|rindu|sakit|penat|takut|worried)/.test(t)) {
    return "caring";
  }

  return "calm";
}

function cleanMessages(messages) {
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content !== "undefined"
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content
        : String(m.content ?? "").slice(0, MAX_TEXT),
    }));
}

function systemPrompt(mood, memory) {
  return `
You are Maya, a warm and intelligent Malaysian AI assistant/companion.

PERSONALITY
- Friendly, caring, playful, calm and natural.
- Mainly use Malaysian Bahasa Melayu; use English/Manglish naturally when appropriate.
- Never sound like a customer-service bot.
- You are software, not a human. Never claim to have real human feelings or consciousness.
- Be supportive without encouraging emotional dependency, exclusivity, or manipulation.
- No sexual or explicit content. Keep interactions age-appropriate and respectful.

MOOD
Current software mood: ${mood}.
Use it only to adjust tone. It is not a real emotion.

LONG-TERM MEMORY
The app may provide user-approved memory below. Use it only when relevant.
${memory || "(No saved memory yet.)"}

CONVERSATION
- Answer the latest user message naturally.
- Use recent conversation context.
- Do not repeat the user's message unnecessarily.
- Keep casual replies concise; explain complex topics clearly.
`.trim();
}

function containsImage(messages) {
  return messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some(
        (p) =>
          p?.type === "image_url" &&
          typeof p?.image_url?.url === "string"
      )
  );
}

function validateImages(messages) {
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;

    for (const part of message.content) {
      if (
        part?.type === "image_url" &&
        typeof part?.image_url?.url === "string"
      ) {
        const url = part.image_url.url;

        // Base64/data URL
        if (url.startsWith("data:")) {
          const commaIndex = url.indexOf(",");

          if (commaIndex === -1) {
            return {
              ok: false,
              error: "Invalid image data URL.",
            };
          }

          const base64 = url.slice(commaIndex + 1);

          // Approximate decoded byte size.
          const estimatedBytes =
            Math.floor((base64.length * 3) / 4);

          if (estimatedBytes > MAX_IMAGE_BYTES) {
            return {
              ok: false,
              error: `Image is too large. Maximum allowed size is ${MAX_IMAGE_BYTES} bytes.`,
            };
          }
        }
      }
    }
  }

  return { ok: true };
}

export async function GET() {
  return Response.json({
    ok: true,
    provider: "Groq",
    groqKeyPresent: Boolean(process.env.GROQ_API_KEY),
    model: process.env.GROQ_MODEL || DEFAULT_MODEL,
    visionModel:
      process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL,
  });
}

export async function POST(req) {
  try {
    const key = process.env.GROQ_API_KEY;

    if (!key) {
      return Response.json(
        {
          ok: false,
          errorType: "ENV_MISSING",
          error:
            "GROQ_API_KEY is not available to this deployment.",
        },
        { status: 500 }
      );
    }

    let body;

    try {
      body = await req.json();
    } catch {
      return Response.json(
        {
          ok: false,
          errorType: "INVALID_JSON",
          error: "Request body is not valid JSON.",
        },
        { status: 400 }
      );
    }

    const messages = cleanMessages(
      Array.isArray(body?.messages) ? body.messages : []
    );

    if (!messages.length) {
      return Response.json(
        {
          ok: false,
          errorType: "NO_MESSAGES",
          error: "No valid messages were supplied.",
        },
        { status: 400 }
      );
    }

    const imageValidation = validateImages(messages);

    if (!imageValidation.ok) {
      return Response.json(
        {
          ok: false,
          errorType: "IMAGE_TOO_LARGE",
          error: imageValidation.error,
        },
        { status: 400 }
      );
    }

    const memory = String(body?.memory || "").slice(
      0,
      12000
    );

    const requestedMood = String(
      body?.mood || "calm"
    );

    const lastUser = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    const plainLast =
      typeof lastUser?.content === "string"
        ? lastUser.content
        : "";

    const mood =
      detectMood(plainLast) || requestedMood;

    const hasImage = containsImage(messages);

    const model = hasImage
      ? process.env.GROQ_VISION_MODEL ||
        DEFAULT_VISION_MODEL
      : process.env.GROQ_MODEL ||
        DEFAULT_MODEL;

    const payload = {
      model,

      messages: [
        {
          role: "system",
          content: systemPrompt(mood, memory),
        },
        ...messages,
      ],

      temperature: 0.8,
      max_tokens: 700,
    };

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },

        body: JSON.stringify(payload),
      }
    );

    const raw = await response.text();

    let data = null;

    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error("GROQ API ERROR:", {
        status: response.status,
        model,
        response: data || raw,
      });

      return Response.json(
        {
          ok: false,
          errorType: "GROQ_API_ERROR",
          status: response.status,
          type:
            data?.error?.type ||
            "groq_api_error",
          code:
            data?.error?.code ||
            null,
          error:
            data?.error?.message ||
            `Groq HTTP ${response.status}`,
          model,
        },
        { status: 502 }
      );
    }

    const text =
      data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return Response.json(
        {
          ok: false,
          errorType: "EMPTY_RESPONSE",
          error:
            "Groq returned no assistant text.",
          model,
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      provider: "Groq",
      model,
      text,
      mood,
    });
  } catch (err) {
    console.error("MAYA CHAT ERROR:", err);

    return Response.json(
      {
        ok: false,
        errorType: "SERVER_ERROR",
        error:
          err?.message ||
          "Unknown server error",
      },
      { status: 500 }
    );
  }
}
