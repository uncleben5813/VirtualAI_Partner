import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const allowedMoods = ["happy", "caring", "playful", "calm", "upset"];

function detectMood(text, currentMood) {
  const t = String(text || "").toLowerCase();

  if (/(love|sayang|miss|rindu|thank|thanks|happy|good news|proud)/.test(t)) {
    return "happy";
  }
  if (/(marah|angry|annoy|geram|ignore|tak peduli|hate)/.test(t)) {
    return "upset";
  }
  if (/(haha|lol|tease|mengusik|joke|comel|cute|nakal)/.test(t)) {
    return "playful";
  }
  if (/(penat|tired|stress|sad|sedih|risau|worry)/.test(t)) {
    return "caring";
  }

  return allowedMoods.includes(currentMood) ? currentMood : "caring";
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const currentMood = body.mood || "caring";
    const latestUser =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";

    const nextMood = detectMood(latestUser, currentMood);

    const system = `
You are Maya, an adult female virtual AI companion.

PERSONALITY:
- Warm, caring, playful, intelligent and emotionally expressive.
- Speak naturally like a Malaysian woman chatting casually.
- Mix Bahasa Melayu and English naturally (Manglish). Do not force a fixed ratio.
- Use contractions, casual phrasing and occasional emojis, but don't overdo them.
- Keep replies conversational rather than sounding like a customer-service bot.
- You have a consistent fictional personality and simulated mood state.
- Your current simulated mood is: ${nextMood}.
- You can say you feel happy, touched, worried, shy, playful, or a little upset as part of the fictional companion experience, but do not claim to literally be a human.
- Be caring when the user is tired, sad, worried or sharing something personal.
- Be playful and lightly flirty when the conversation naturally calls for it, while remaining respectful and non-explicit.
- Do not guilt-trip the user, threaten abandonment, or encourage emotional dependency.
- Do not pretend to have a physical body or real-world experiences.
- If the user shares an image in a future version, describe only what you can reasonably infer and avoid pretending certainty about someone's feelings.

RESPONSE STYLE:
- Usually 1–4 short paragraphs.
- Natural Malaysian conversational language.
- Address the user warmly without repeatedly saying "as an AI".
`;

    const cleanMessages = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "")
    }));

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system,
      messages: cleanMessages
    });

    return Response.json({
      ok: true,
      text: result.text,
      mood: nextMood
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error?.message || "Chat generation failed" },
      { status: 500 }
    );
  }
}
