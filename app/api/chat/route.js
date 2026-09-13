export const runtime = "nodejs";
function detectMood(text = "") {
  const t = String(text).toLowerCase();
  if (/(haha|lol|happy|seronok|best|love|sayang|cantik|comel)/.test(t)) {
    return "happy";
  }
  if (/(marah|geram|bengang|upset|sad|sedih|stress)/.test(t)) {
    return "upset";
  }
  if (/(hehe|flirt|manja|nakal|tease|mengusik)/.test(t)) {
    return "playful";
  }
  if (/(risau|jaga|care|rindu|sakit|penat|takut)/.test(t)) {
    return "caring";
  }
  return "calm";
}
export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  return Response.json({
    ok: true,
    provider: "OpenAI",
    openaiKeyPresent: Boolean(key),
    keyPrefix: key ? `${key.slice(0, 7)}...` : null,
    message: key
      ? "OPENAI_API_KEY is visible to the Vercel server."
      : "OPENAI_API_KEY is NOT visible to the Vercel server."
  });
}
export async function POST(req) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return Response.json(
        {
          ok: false,
          errorType: "ENV_MISSING",
          error: "OPENAI_API_KEY is not available to this deployment."
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
          error: "Request body is not valid JSON."
        },
        { status: 400 }
      );
    }
    const messages = Array.isArray(body?.messages)
      ? body.messages
      : [];
    const requestedMood = body?.mood || "calm";
    const cleanMessages = messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content !== "undefined"
      )
      .slice(-20)
      .map((m) => ({
        role: m.role,
        content: String(m.content ?? "").slice(0, 8000)
      }));
    if (cleanMessages.length === 0) {
      return Response.json(
        {
          ok: false,
          errorType: "NO_MESSAGES",
          error: "No valid messages were supplied."
        },
        { status: 400 }
      );
    }
    const lastUserMessage =
      cleanMessages
        .filter((m) => m.role === "user")
        .at(-1)?.content || "";
    const mood = detectMood(lastUserMessage) || requestedMood;
    const system = `
You are Maya, an adult female virtual AI companion.
PERSONALITY:
- Warm
- Caring
- Playful
- Intelligent
- Natural
- Affectionate without being emotionally manipulative
- Conversational, not robotic
LANGUAGE:
- Mainly Malaysian Bahasa Melayu.
- Use natural English or Manglish when it fits the conversation.
- Do not sound like a formal customer-service bot.
- Keep replies natural and human-like.
MOOD:
Current simulated mood: ${mood}.
The mood is only a software state used to influence your tone.
You do not have real human feelings.
STYLE:
- Reply directly to what the user says.
- Do not unnecessarily repeat the user's message.
- Avoid long explanations unless the user asks.
- For casual conversation, keep the response reasonably short.
- You can use emojis naturally but don't overuse them.
- Light teasing and flirting are allowed, but never explicit sexual content.
- Never guilt-trip the user.
- Never threaten abandonment.
- Never claim that the user is the only person you need.
- Never encourage unhealthy emotional dependency.
`;
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: system.trim()
            },
            ...cleanMessages
          ],
          temperature: 0.8,
          max_tokens: 500
        })
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
      const apiMessage =
        data?.error?.message ||
        `OpenAI HTTP ${response.status}`;
      const apiType =
        data?.error?.type ||
        "openai_api_error";
      const apiCode =
        data?.error?.code ||
        null;
      const isCreditsError =
        response.status === 429 &&
        (
          /quota/i.test(apiMessage) ||
          /credit/i.test(apiMessage) ||
          /billing/i.test(apiMessage) ||
          apiCode === "insufficient_quota"
        );
      return Response.json(
        {
          ok: false,
          errorType: isCreditsError
            ? "OPENAI_CREDITS_EXHAUSTED"
            : "OPENAI_API_ERROR",
          status: response.status,
          type: apiType,
          code: apiCode,
          error: isCreditsError
            ? "OpenAI API credits/quota are exhausted. Add API billing/credits or switch the app to another AI provider."
            : apiMessage
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
          error: "OpenAI returned no assistant text."
        },
        { status: 502 }
      );
    }
    return Response.json({
      ok: true,
      text,
      mood
    });
  } catch (err) {
    console.error("CHAT API ERROR:", err);
    return Response.json(
      {
        ok: false,
        errorType: "SERVER_ERROR",
        error: err?.message || "Unknown server error"
      },
      { status: 500 }
    );
  }
}
