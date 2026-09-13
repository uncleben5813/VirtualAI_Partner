# Maya AI Companion — Full V3

Included:
- Groq AI brain
- Server-side API key
- Long-term memory stored locally
- Conversation history persistence
- Mood/emotion software state
- Maya personality
- Mood-aware responses
- Voice input using browser Speech Recognition where supported
- Voice output using browser Speech Synthesis
- Image attachment + optional Groq vision model
- Settings/personality controls
- Mobile-friendly UI
- Error/fallback handling
- New chat / clear history
- Export/import memory backup
- Persistence after refresh/closing the app

## Environment variables

Create `.env.local` locally or add these to Vercel:

```env
GROQ_API_KEY=your_secret_key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

`GROQ_API_KEY` is only read by `app/api/chat/route.js`, so it is not exposed to the browser.

## Run

```bash
npm install
npm run dev
```

Then open the local URL shown by Next.js.

## Vercel

1. Import the project/repository.
2. Add `GROQ_API_KEY` under Project Settings → Environment Variables.
3. Redeploy.
4. Do NOT put `GROQ_API_KEY` in `NEXT_PUBLIC_*`.

## Persistence

The browser stores:
- conversation history
- mood
- long-term memory
- settings

in localStorage. It survives normal refreshes and closing/reopening the app on the same browser/device.

Use **Export backup** to create a JSON backup and **Import backup** to restore it elsewhere.

## Voice

Voice features depend on the browser/device:
- Input: Web Speech API / webkitSpeechRecognition
- Output: SpeechSynthesis

Microphone permission is required for voice input.

## Images

Images are previewed in the chat and sent to the server as data URLs. When an image is present, the backend switches to `GROQ_VISION_MODEL`.

If your Groq account/model does not support the configured vision model, change `GROQ_VISION_MODEL` to a vision-capable model available to your account.

## Important security note

The chat history and long-term memory in this V3 are client-side local persistence. They are not a cloud database and are not automatically synchronized across devices.

For true cross-device permanent memory, the next upgrade should use a database/auth layer (for example PostgreSQL/Supabase/Firebase) while keeping the Groq API key server-side.
