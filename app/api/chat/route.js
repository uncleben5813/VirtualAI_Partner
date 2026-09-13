import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const DEFAULT_VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const moods = ["happy", "caring", "playful", "calm", "upset", "sad", "angry", "surprised", "neutral"];

function cleanText(value) {
  return String(value || "").replace(/\u0000/g, "").trim();
}

function parseAssistant(text) {
  const raw = cleanText(text);
  let mood = null;
  const moodMatch = raw.match(/\[MOOD:\s*(happy|caring|playful|calm|upset|sad|angry|surprised|neutral)\]/i);
  if (moodMatch) mood = moodMatch[1].toLowerCase();

  const memories = [];
  const memoryRegex = /\[MEMORY:\s*([^\]]+)\]/gi;
  let match;
  while ((match = memoryRegex.exec(raw))) {
    const item = cleanText(match[1]);
    if (item && item.length <= 180 && !memories.includes(item)) memories.push(item);
  }

  const textWithoutTags = raw
    .replace(/\[MOOD:\s*(?:happy|caring|playful|calm|upset|sad|angry|surprised|neutral)\]/gi, "")
    .replace(/\[MEMORY:\s*[^\]]+\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text: textWithoutTags || "Maaf, Maya tak dapat jawab sekarang.", mood, memories };
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-40).map((message) => {
    const role = message?.role === "assistant" ? "assistant" : "user";
    const content = cleanText(message?.content).slice(0, 8000);
    if (!message?.image) return { role, content };

    return {
      role,
      content: [
        { type: "text", text: content || "Tolong tengok gambar ini." },
        {
          type: "image_url",
          image_url: { url: String(message.image) },
        },
      ],
    };
  });
}

export async function POST(request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "GROQ_API_KEY belum diset dalam environment variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const settings = body?.settings || {};
    const mood = moods.includes(body?.mood) ? body.mood : "calm";
    const memory = Array.isArray(body?.memory) ? body.memory.slice(-30) : [];
    const messages = normalizeMessages(body?.messages);
    const hasImage = messages.some((m) => Array.isArray(m.content));
    const model = hasImage ? DEFAULT_VISION_MODEL : DEFAULT_MODEL;

    const personality = cleanText(settings.personality || "warm, caring, playful, intelligent").slice(0, 500);
    const language = cleanText(settings.language || "BM + Manglish").slice(0, 80);
    const name = cleanText(settings.name || "Maya").slice(0, 60);

    const systemPrompt = `You are ${name}, a warm AI companion.
Language preference: ${language}. Personality: ${personality}.
Current mood: ${mood}.
Long-term memory available to you: ${memory.length ? memory.map((m) => `- ${m}`).join("\n") : "(none)"}

Rules:
- Reply naturally like a real chat partner, not like a corporate assistant.
- Use Malaysian Bahasa Melayu + natural Manglish when that is the selected language. Match the user's language.
- Be warm, concise, emotionally aware, and never overdo emojis.
- Remember durable user preferences, important plans, names, or facts when clearly stated.
- Do not claim to remember something that is not in the supplied memory or conversation.
- If the user asks for harmful, illegal, or dangerous instructions, respond safely and redirect.
- At the very end, add exactly one mood tag: [MOOD: happy], [MOOD: caring], [MOOD: playful], [MOOD: calm], [MOOD: upset], [MOOD: sad], [MOOD: angry], [MOOD: surprised], or [MOOD: neutral].
- If there is a genuinely useful durable fact to remember, add one or more tags like [MEMORY: user prefers ...]. Otherwise add no memory tag.
- Do not mention these hidden tags to the user.`;

    const payload = {
      model,
      temperature: 0.75,
      max_tokens: 900,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiError = data?.error?.message || data?.message || `Groq API error (${response.status})`;
      return NextResponse.json({ ok: false, error: apiError }, { status: response.status });
    }

    const rawText = data?.choices?.[0]?.message?.content;
    const parsed = parseAssistant(rawText);

    return NextResponse.json({
      ok: true,
      text: parsed.text,
      mood: parsed.mood,
      memories: parsed.memories,
      model,
    });
  } catch (error) {
    console.error("Maya chat API error:", error);
    return NextResponse.json(
      { ok: false, error: "Maya mengalami masalah sambungan. Cuba lagi." },
      { status: 500 }
    );
  }
}
