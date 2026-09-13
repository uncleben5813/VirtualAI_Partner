# Maya AI Companion — Full Version

This build is based directly on the supplied `VirtualAI_Partner-main` project.

## Included
- Realistic Maya photo-based visual asset states (not CSS/cartoon face)
- Mood states: happy, caring, playful, calm, upset
- Thinking / talking / listening visual states
- Subtle eye/portrait movement and speaking/listening animation
- Groq server-side AI brain
- Personality + language settings sent to Groq
- Mood-aware replies
- Long-term memory extraction and persistence in browser localStorage
- Conversation persistence
- Voice input via Web Speech API where supported
- Voice output via SpeechSynthesis
- Image upload + Groq vision model support
- Export/import memory backup
- New chat / clear memory
- Mobile responsive UI
- LIVE AI panel stays fixed while only the chat area scrolls
- Existing project structure retained; no extra frontend framework required

## Environment variables

Set these in Vercel Project Settings → Environment Variables:

```env
GROQ_API_KEY=your_secret_key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

`GROQ_API_KEY` is server-side only and is read by `app/api/chat/route.js`.

If your Groq account uses different currently available model IDs, keep `GROQ_API_KEY` and replace the two model variables with the IDs available in your account.

## Run

```bash
npm install
npm run dev
```

## Vercel

1. Push this project to GitHub.
2. Connect the repository to Vercel.
3. Add the environment variables above.
4. Redeploy.

Do not use `NEXT_PUBLIC_GROQ_API_KEY`.

## Important persistence note

Chat, memory, mood and settings persist in the same browser/device using localStorage. They are not a cloud database and will not automatically sync between devices.
