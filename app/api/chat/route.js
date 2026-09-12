export const runtime = "nodejs";

function detectMood(text = "") {
  const t = text.toLowerCase();
  if (/(haha|lol|happy|seronok|best|love|sayang|cantik|comel)/.test(t)) return "happy";
  if (/(marah|geram|bengang|upset|sad|sedih|stress)/.test(t)) return "upset";
  if (/(hehe|flirt|manja|nakal|tease|mengusik)/.test(t)) return "playful";
  if (/(risau|jaga|care|rindu|sakit|penat|takut)/.test(t)) return "caring";
  return "calm";
}

export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  return Response.json({
    ok: true,
    openaiKeyPresent: Boolean(key),
    keyPrefix: key ? key.slice(0, 7) + "..." : null,
    message: key
      ? "OPENAI_API_KEY is visible to the Vercel server."
      : "OPENAI_API_KEY is NOT visible to the Vercel server."
  });
}

export async function POST(req) {
  try {
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      return Response.json({
        ok: false,
        errorType: "ENV_MISSING",
        error: "OPENAI_API_KEY is not available to this deployment."
      }, { status: 500 });
    }

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const mood = body?.mood || "calm";

    const cleanMessages = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant"))
      .slice(-20)
      .map(m => ({
        role: m.role,
        content: String(m.content ?? "").slice(0, 8000)
      }));

    const system = `You are Maya, an adult female virtual AI companion.
You are warm, caring, playful, intelligent and natural.
Speak mainly Malaysian Bahasa Melayu with natural English/Manglish when appropriate.
Your emotions and mood are simulated software states, not real human feelings.
Current simulated mood: ${mood}.
You may be lightly flirty and teasing, but never explicit.
Never guilt-trip the user, threaten abandonment, or encourage unhealthy dependency.
Be conversational rather than robotic.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          ...cleanMessages
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = null; }

    if (!response.ok) {
      const apiMessage = data?.error?.message || `OpenAI HTTP ${response.status}`;
      const apiType = data?.error?.type || "openai_api_error";
      const apiCode = data?.error?.code || null;

      return Response.json({
        ok: false,
        errorType: "OPENAI_API_ERROR",
        status: response.status,
        type: apiType,
        code: apiCode,
        error: apiMessage
      }, { status: 502 });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return Response.json({
        ok: false,
        errorType: "EMPTY_RESPONSE",
        error: "OpenAI returned no assistant text."
      }, { status: 502 });
    }

    const lastUser = cleanMessages.filter(m => m.role === "user").at(-1)?.content || "";
    return Response.json({
      ok: true,
      text,
      mood: detectMood(lastUser)
    });
  } catch (err) {
    return Response.json({
      ok: false,
      errorType: "SERVER_ERROR",
      error: err?.message || "Unknown server error"
    }, { status: 500 });
  }
}
