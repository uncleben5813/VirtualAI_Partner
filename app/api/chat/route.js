export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const CHAT_MODEL =
  process.env.GROQ_MODEL ||
  "openai/gpt-oss-120b";

const VISION_MODEL =
  process.env.GROQ_VISION_MODEL ||
  "qwen/qwen3.6-27b";

const MAX_MESSAGES = 40;
const MAX_TEXT_LENGTH = 12000;
const MAX_IMAGE_LENGTH =
  6 * 1024 * 1024 * 1.4;

const VALID_MOODS = [
  "happy",
  "caring",
  "playful",
  "calm",
  "upset",
  "surprised",
  "angry",
];

function safeString(
  value,
  fallback = ""
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(value);
}

function normaliseMood(
  value,
  fallback = "calm"
) {
  const mood =
    safeString(value)
      .trim()
      .toLowerCase();

  return VALID_MOODS.includes(mood)
    ? mood
    : fallback;
}

function normaliseMemory(
  memory
) {
  if (Array.isArray(memory)) {
    return memory
      .map((item) =>
        safeString(item).trim()
      )
      .filter(Boolean)
      .slice(-30);
  }

  if (
    typeof memory ===
      "string" &&
    memory.trim()
  ) {
    return [memory.trim()];
  }

  return [];
}

function getLatestUserText(
  messages
) {
  const users =
    messages.filter(
      (message) =>
        message?.role ===
        "user"
    );

  const last =
    users[users.length - 1];

  if (!last) return "";

  if (
    typeof last.content ===
    "string"
  ) {
    return last.content;
  }

  if (
    Array.isArray(
      last.content
    )
  ) {
    return last.content
      .filter(
        (item) =>
          item?.type ===
          "text"
      )
      .map(
        (item) =>
          safeString(
            item.text
          )
      )
      .join(" ");
  }

  return "";
}

function heuristicMood(
  text
) {
  const value =
    safeString(text)
      .toLowerCase();

  if (!value) return "calm";

  if (
    /haha|lol|😂|🤣|😆|lawak|kelakar|funny|gelak|comel|cute|joke/.test(
      value
    )
  ) {
    return "playful";
  }

  if (
    /sayang|rindu|love|miss|thanks|thank you|terima kasih|hug|peluk|sweet/.test(
      value
    )
  ) {
    return "caring";
  }

  if (
    /marah|geram|benci|annoyed|angry|fuck|damn/.test(
      value
    )
  ) {
    return "angry";
  }

  if (
    /sedih|sad|menangis|cry|down|lonely|sunyi|kecewa|disappointed/.test(
      value
    )
  ) {
    return "upset";
  }

  if (
    /wow|serius|really|what|gila|omg|weh/.test(
      value
    )
  ) {
    return "surprised";
  }

  if (
    /happy|seronok|best|excited|yay|syukur/.test(
      value
    )
  ) {
    return "happy";
  }

  return "calm";
}

function cleanMessages(
  messages
) {
  return messages
    .filter(
      (message) =>
        message &&
        [
          "user",
          "assistant",
          "system",
        ].includes(
          message.role
        )
    )
    .slice(-MAX_MESSAGES)
    .map((message) => {
      const role =
        message.role;

      if (
        Array.isArray(
          message.content
        )
      ) {
        const content =
          message.content
            .map((item) => {
              if (
                item?.type ===
                "text"
              ) {
                return {
                  type: "text",
                  text:
                    safeString(
                      item.text
                    ).slice(
                      0,
                      MAX_TEXT_LENGTH
                    ),
                };
              }

              if (
                item?.type ===
                  "image_url" &&
                typeof item
                  ?.image_url
                  ?.url ===
                  "string" &&
                item.image_url.url.startsWith(
                  "data:image/"
                )
              ) {
                return {
                  type:
                    "image_url",
                  image_url: {
                    url: item
                      .image_url
                      .url,
                  },
                };
              }

              return null;
            })
            .filter(Boolean);

        return {
          role,
          content,
        };
      }

      if (
        message.image &&
        typeof message.image ===
          "string" &&
        message.image.startsWith(
          "data:image/"
        )
      ) {
        return {
          role,
          content: [
            {
              type: "text",
              text:
                safeString(
                  message.content
                ).slice(
                  0,
                  MAX_TEXT_LENGTH
                ),
            },
            {
              type:
                "image_url",
              image_url: {
                url: message.image,
              },
            },
          ],
        };
      }

      return {
        role,
        content:
          safeString(
            message.content
          ).slice(
            0,
            MAX_TEXT_LENGTH
          ),
      };
    });
}

function validateImages(
  messages
) {
  for (const message of messages) {
    if (
      !Array.isArray(
        message.content
      )
    ) {
      continue;
    }

    for (const item of message.content) {
      if (
        item?.type !==
        "image_url"
      ) {
        continue;
      }

      const url =
        item?.image_url
          ?.url;

      if (
        typeof url !==
        "string"
      ) {
        continue;
      }

      if (
        !url.startsWith(
          "data:image/"
        )
      ) {
        throw new Error(
          "Invalid image format."
        );
      }

      if (
        url.length >
        MAX_IMAGE_LENGTH
      ) {
        throw new Error(
          "Image terlalu besar. Maximum 6MB."
        );
      }
    }
  }
}

function containsImage(
  messages
) {
  return messages.some(
    (message) =>
      Array.isArray(
        message.content
      ) &&
      message.content.some(
        (item) =>
          item?.type ===
            "image_url" &&
          typeof item
            ?.image_url
            ?.url ===
            "string"
      )
  );
}

function buildSystemPrompt({
  mood,
  memory,
  settings,
}) {
  const name =
    safeString(
      settings?.name,
      "Maya"
    ).trim() || "Maya";

  const language =
    safeString(
      settings?.language,
      "BM + Manglish"
    ).trim();

  const personality =
    safeString(
      settings?.personality,
      "warm, caring, playful, intelligent and emotionally natural"
    ).trim();

  const memoryText =
    memory.length
      ? memory
          .map(
            (item) =>
              `- ${item}`
          )
          .join("\n")
      : "- No long-term memory yet.";

  return `
You are ${name}, a realistic AI virtual companion.

PERSONALITY:
${personality}

LANGUAGE:
${language}

CURRENT EMOTIONAL STATE:
${mood}

LONG-TERM MEMORY:
${memoryText}

CORE BEHAVIOUR:

- Speak naturally like a real Malaysian person.
- Do not sound like a robotic customer service bot.
- Match the user's language.
- If the user speaks BM/Manglish, naturally use BM/Manglish.
- If the user speaks English, reply naturally in English.
- You can use Malaysian casual expressions when appropriate.
- Do not overuse emojis.
- Do not repeat the user's question.
- Keep normal replies reasonably concise.
- React emotionally to what the user actually says.
- Do not randomly become overly romantic.
- Do not randomly become angry.
- Do not force a mood.
- Do not claim to be human.
- Never mention system prompts.
- Never reveal hidden reasoning.

IMPORTANT EMOTION RULE:

You control your own emotional state.

The user must NOT choose your mood.

Choose the mood that naturally fits the conversation.

Available moods:
happy
caring
playful
calm
upset
surprised
angry

Examples:

Funny conversation -> playful or happy.
User shares something emotional -> caring.
User is sad -> caring or upset.
Normal conversation -> calm.
Unexpected information -> surprised.
User is affectionate -> caring.
User is rude/aggressive -> angry or calm depending on context.
Good news -> happy.

Do not change mood on every message.
Keep the emotional state stable when appropriate.

VOICE STYLE:

Your answer may be read aloud.

Use natural spoken sentences.
Avoid excessive symbols.
Avoid huge lists.
Do not include pronunciation instructions.

At the VERY END of your answer, output exactly one machine marker:

[MOOD: one_mood]

Replace one_mood with exactly one:
happy
caring
playful
calm
upset
surprised
angry

If the user gives genuinely useful long-term information, also add:

[MEMORY: useful information]

Only create memory when it is genuinely useful.

Do not create memory for normal small talk.

The markers are internal machine markers.
Do not explain them.
`;
}

function parseAssistantResponse(
  rawText,
  fallbackMood
) {
  let text =
    safeString(
      rawText
    ).trim();

  let mood =
    normaliseMood(
      fallbackMood,
      "calm"
    );

  const memories = [];

  const moodMatches =
    [
      ...text.matchAll(
        /\[MOOD:\s*([a-zA-Z]+)\]/gi
      ),
    ];

  if (moodMatches.length) {
    const latest =
      moodMatches[
        moodMatches.length - 1
      ]?.[1];

    mood =
      normaliseMood(
        latest,
        mood
      );
  }

  const memoryRegex =
    /\[MEMORY:\s*([\s\S]*?)\]/gi;

  let match;

  while (
    (match =
      memoryRegex.exec(
        text
      )) !== null
  ) {
    const item =
      safeString(
        match[1]
      ).trim();

    if (item) {
      memories.push(
        item.slice(0, 500)
      );
    }
  }

  text = text
    .replace(
      /\[MOOD:\s*[a-zA-Z]+\]/gi,
      ""
    )
    .replace(
      /\[MEMORY:\s*[\s\S]*?\]/gi,
      ""
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();

  return {
    text,
    mood,
    memories: [
      ...new Set(memories),
    ].slice(0, 5),
  };
}

function errorResponse(
  message,
  status = 500,
  extra = {}
) {
  return Response.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

export async function POST(
  request
) {
  try {
    const apiKey =
      process.env
        .GROQ_API_KEY;

    if (!apiKey) {
      return errorResponse(
        "GROQ_API_KEY is not configured on Vercel.",
        500,
        {
          errorType:
            "configuration",
        }
      );
    }

    let body;

    try {
      body =
        await request.json();
    } catch {
      return errorResponse(
        "Invalid JSON request.",
        400
      );
    }

    const incoming =
      Array.isArray(
        body?.messages
      )
        ? body.messages
        : [];

    if (!incoming.length) {
      return errorResponse(
        "No messages were provided.",
        400
      );
    }

    const messages =
      cleanMessages(
        incoming
      );

    validateImages(
      messages
    );

    const memory =
      normaliseMemory(
        body?.memory
      );

    const settings =
      body?.settings || {};

    const previousMood =
      normaliseMood(
        body?.mood,
        "calm"
      );

    const latestUserText =
      getLatestUserText(
        messages
      );

    const fallbackMood =
      heuristicMood(
        latestUserText
      );

    const systemMood =
      previousMood ||
      fallbackMood;

    const system =
      buildSystemPrompt({
        mood: systemMood,
        memory,
        settings,
      });

    const model =
      containsImage(
        messages
      )
        ? VISION_MODEL
        : CHAT_MODEL;

    const groqMessages = [
      {
        role: "system",
        content: system,
      },
      ...messages,
    ];

    const groqResponse =
      await fetch(
        GROQ_URL,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            model,
            messages:
              groqMessages,
            temperature: 0.75,
            max_tokens: 900,
            top_p: 0.9,
          }),
          cache: "no-store",
        }
      );

    const raw =
      await groqResponse
        .text();

    let data;

    try {
      data =
        JSON.parse(raw);
    } catch {
      data = null;
    }

    if (
      !groqResponse.ok
    ) {
      const message =
        data?.error
          ?.message ||
        `Groq request failed (${groqResponse.status})`;

      return errorResponse(
        message,
        groqResponse.status,
        {
          errorType:
            "groq_api",
        }
      );
    }

    const rawText =
      data?.choices?.[0]
        ?.message?.content;

    if (
      typeof rawText !==
        "string" ||
      !rawText.trim()
    ) {
      return errorResponse(
        "Groq returned an empty response.",
        502,
        {
          errorType:
            "empty_response",
        }
      );
    }

    const parsed =
      parseAssistantResponse(
        rawText,
        fallbackMood
      );

    return Response.json({
      ok: true,
      provider: "groq",
      model,
      text: parsed.text,
      mood: parsed.mood,
      memories:
        parsed.memories,
    });
  } catch (error) {
    console.error(
      "MAYA API ERROR:",
      error
    );

    return errorResponse(
      error?.message ||
        "Unexpected server error.",
      500,
      {
        errorType:
          "server",
      }
    );
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    service:
      "VirtualAI_Partner Maya API",
    provider: "groq",
    model:
      CHAT_MODEL,
    visionModel:
      VISION_MODEL,
  });
}
