"use client";

import { useState } from "react";

const moods = {
  happy: { label: "Happy", emoji: "😊" },
  caring: { label: "Caring", emoji: "❤️" },
  playful: { label: "Playful", emoji: "😏" },
  calm: { label: "Calm", emoji: "🌙" },
  upset: { label: "Upset", emoji: "🥺" }
};

export default function Companion() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hii 😊 I'm Maya. I’m your little AI companion. You can talk to me in BM, English, or campur-campur pun boleh. How are you this morning?"
    }
  ]);
  const [input, setInput] = useState("");
  const [mood, setMood] = useState("caring");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          mood
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "API error");

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.text, mood: data.mood }
      ]);
      if (data.mood && moods[data.mood]) setMood(data.mood);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Aduh, something went wrong 😭 Check your API key and Vercel environment variables."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="app">
        <header className="topbar">
          <div className="identity">
            <div className="avatar">M</div>
            <div>
              <h1>Maya</h1>
              <p><span className="dot" /> online · {moods[mood].emoji} {moods[mood].label}</p>
            </div>
          </div>
          <div className="badge">AI COMPANION · V1</div>
        </header>

        <div className="profile">
          <div className="portrait">
            <div className="hair" />
            <div className="face">
              <span className="eye left" />
              <span className="eye right" />
              <span className="mouth" />
            </div>
          </div>
          <div className="profileText">
            <h2>Hey, I’m Maya 👋</h2>
            <p>
              A warm, playful virtual companion. Talk to me naturally —
              <b> BM, English, or Manglish.</b>
            </p>
            <div className="chips">
              {Object.entries(moods).map(([key, value]) => (
                <button
                  key={key}
                  className={mood === key ? "chip active" : "chip"}
                  onClick={() => setMood(key)}
                >
                  {value.emoji} {value.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`row ${m.role}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="row assistant">
              <div className="bubble typing">Maya is thinking…</div>
            </div>
          )}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Maya…"
            autoComplete="off"
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>

        <footer>
          V1 prototype · Mood is simulated by software state, not real human emotion.
        </footer>
      </section>
    </main>
  );
}
