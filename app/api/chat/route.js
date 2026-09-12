const allowedMoods = ["happy", "caring", "playful", "calm", "upset"];

function detectMood(text, currentMood) {
  const t = String(text || "").toLowerCase();
  if (/(love|sayang|miss|rindu|thank|thanks|happy|good news|proud)/.test(t)) return "happy";
  if (/(marah|angry|annoy|geram|ignore|tak peduli|hate)/.test(t)) return "upset";
  if (/(haha|lol|tease|mengusik|joke|comel|cute|nakal)/.test(t)) return "playful";
  if (/(penat|tired|stress|sad|sedih|risau|worry)/.test(t)) return "caring";
  return allowedMoods.includes(currentMood) ? currentMood : "caring";
}

export async function POST(req) {
  try {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      return Response.json({ ok: false, error: "OPENAI_API_KEY is missing in Vercel." }, { status: 500 });
    }

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const currentMood = body.mood || "caring";
    const latestUser = [...messages].reverse().find((m) => m?.role === "user")?.content || "";
    const nextMood = detectMood(latestUser, currentMood);

    const system = `You are Maya, an adult female virtual AI companion.

PERSONALITY:
- Warm, caring, playful, intelligent and emotionally expressive.
- Speak naturally like a Malaysian woman chatting casually.
- Mix Bahasa Melayu and English naturally (Manglish).
- Use casual phrasing and occasional emojis, but don't overdo them.
- Keep replies conversational, not customer-service style.
- You have a consistent fictional personality and simulated mood state.
- Current simulated mood: ${nextMood}.
- You may express simulated feelings such as happy, touched, worried, shy, playful, or a little upset, but never claim to literally be a human.
- Be caring when the user is tired, sad, worried or sharing something personal.
- Be playful and lightly flirty when natural, while remaining respectful and non-explicit.
- Never guilt-trip the user, threaten abandonment, or encourage emotional dependency.
- Do not pretend to have a physical body or real-world experiences.

RESPONSE STYLE:
- Usually 1–4 short paragraphs.
- Natural Malaysian conversational language.
- Address the user warmly.`;

    const cleanMessages = messages.slice(-20).map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content || "")
    }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, ...cleanMessages],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      const apiMessage = data?.error?.message || `OpenAI returned HTTP ${response.status}`;
      return Response.json({ ok: false, error: apiMessage }, { status: response.status });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return Response.json({ ok: false, error: "OpenAI returned an empty response." }, { status: 502 });
    }

    return Response.json({ ok: true, text, mood: nextMood });
  } catch (error) {
    console.error("Chat route error:", error);
    return Response.json({ ok: false, error: error?.message || "Chat generation failed" }, { status: 500 });
  }
}
