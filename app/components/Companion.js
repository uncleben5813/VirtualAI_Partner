"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const moods = {
  happy: { label: "Happy", emoji: "😊" },
  caring: { label: "Caring", emoji: "❤️" },
  playful: { label: "Playful", emoji: "✨" },
  calm: { label: "Calm", emoji: "🌙" },
  upset: { label: "Upset", emoji: "🥺" },
};

const STORAGE = {
  messages: "maya_messages_v3",
  mood: "maya_mood_v3",
  memory: "maya_memory_v3",
  settings: "maya_settings_v3",
};

const defaultMessage = {
  role: "assistant",
  content:
    "Hii 😊 Saya Maya. BM, English atau Manglish semua boleh. Apa cerita hari ni?",
};

const defaultSettings = {
  name: "Maya",
  language: "BM + Manglish",
  autoSpeak: false,
  voiceRate: 1,
  personality: "Warm, caring, playful, intelligent",
};

function safeParse(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function makeImageData(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > 6_000_000) {
      reject(new Error("Image terlalu besar. Maksimum 6MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

export default function Companion() {
  const [messages, setMessages] = useState([defaultMessage]);
  const [input, setInput] = useState("");
  const [mood, setMood] = useState("caring");
  const [memory, setMemory] = useState("");
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [notice, setNotice] = useState("");
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const chatRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMessages(safeParse(STORAGE.messages, [defaultMessage]));
    setMood(safeParse(STORAGE.mood, "caring"));
    setMemory(localStorage.getItem(STORAGE.memory) || "");
    setSettings({ ...defaultSettings, ...safeParse(STORAGE.settings, {}) });
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE.messages, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE.mood, JSON.stringify(mood)); } catch {}
  }, [mood]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE.memory, memory); } catch {}
  }, [memory]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE.settings, JSON.stringify(settings)); } catch {}
  }, [settings]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const canVoiceInput = useMemo(
    () => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    []
  );
  const canVoiceOutput = useMemo(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    []
  );

  function updateSetting(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function startVoiceInput() {
    if (!canVoiceInput) {
      setNotice("Voice input tak disokong oleh browser/device ini.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ms-MY";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("Voice input gagal atau microphone tidak dibenarkan.");
    };
    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      setInput((v) => `${v} ${finalText}`.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function speak(text, index = null) {
    if (!canVoiceOutput) {
      setNotice("Voice output tak disokong oleh browser/device ini.");
      return;
    }

    window.speechSynthesis.cancel();
    if (speakingIndex === index) {
      setSpeakingIndex(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ms-MY";
    utterance.rate = Number(settings.voiceRate) || 1;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  async function attachImage(file) {
    try {
      const data = await makeImageData(file);
      setImage(data);
      setNotice("Image ready. Hantar mesej untuk Maya lihat/analyse.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && !image) || loading) return;

    const content = image
      ? [
          ...(text ? [{ type: "text", text }] : [{ type: "text", text: "Please analyse this image." }]),
          { type: "image_url", image_url: { url: image.dataUrl } },
        ]
      : text;

    const userMessage = {
      role: "user",
      content,
      imageName: image?.name || null,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setImage(null);
    setLoading(true);
    setNotice("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-40),
          mood,
          memory,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.text) {
        throw new Error(
          `${data?.errorType ? data.errorType + ": " : ""}${data?.error || `API request failed (${res.status})`}`
        );
      }

      const assistantMessage = {
        role: "assistant",
        content: data.text,
        mood: data.mood,
      };

      setMessages((current) => [...current, assistantMessage]);
      if (data.mood && moods[data.mood]) setMood(data.mood);

      if (settings.autoSpeak) {
        setTimeout(() => speak(data.text, nextMessages.length), 80);
      }
    } catch (err) {
      console.error(err);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `⚠️ Maya tak dapat jawab sekarang.\n\n${err?.message || "Unknown error"}\n\nCheck GROQ_API_KEY / Vercel environment variables.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    window.speechSynthesis?.cancel();
    setSpeakingIndex(null);
    setMessages([defaultMessage]);
    setNotice("New conversation started.");
  }

  function clearHistory() {
    if (!window.confirm("Padam semua conversation history pada device ini?")) return;
    localStorage.removeItem(STORAGE.messages);
    setMessages([defaultMessage]);
    setNotice("Conversation history cleared.");
  }

  function exportData() {
    const data = {
      version: 3,
      exportedAt: new Date().toISOString(),
      messages,
      mood,
      memory,
      settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maya-memory-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Memory + conversation backup exported.");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.messages)) setMessages(data.messages);
        if (typeof data.mood === "string") setMood(data.mood);
        if (typeof data.memory === "string") setMemory(data.memory);
        if (data.settings) setSettings({ ...defaultSettings, ...data.settings });
        setNotice("Backup restored.");
      } catch {
        setNotice("Backup JSON tidak sah.");
      }
    };
    reader.readAsText(file);
  }

  function saveMemory() {
    localStorage.setItem(STORAGE.memory, memory);
    setNotice("Long-term memory saved pada device ini.");
  }

  return (
    <main className="shell">
      <section className="app">
        <header className="topbar">
          <div className="identity">
            <div className="avatar">M</div>
            <div>
              <h1>{settings.name}</h1>
              <p>
                <span className="dot" /> online · {moods[mood]?.emoji} {moods[mood]?.label}
              </p>
            </div>
          </div>

          <div className="topActions">
            <button className="iconBtn" onClick={() => setShowSettings((v) => !v)} aria-label="Settings">⚙️</button>
            <span className="badge">GROQ · V3</span>
          </div>
        </header>

        <div className="profile">
          <div className="portrait" aria-hidden="true">
            <div className="hair" />
            <div className="face">
              <span className="eye left" />
              <span className="eye right" />
              <span className="mouth" />
            </div>
          </div>

          <div className="profileText">
            <h2>Hey, I’m {settings.name} 👋</h2>
            <p>
              AI assistant/companion dengan <b>Groq brain</b>, mood state,
              conversation history dan long-term memory.
            </p>

            <div className="chips">
              {Object.entries(moods).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className={mood === key ? "chip active" : "chip"}
                  onClick={() => setMood(key)}
                >
                  {value.emoji} {value.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showSettings && (
          <aside className="settings">
            <div className="settingsHeader">
              <div>
                <h3>Settings & Memory</h3>
                <p>Semua state frontend kekal selepas refresh/close pada device ini.</p>
              </div>
              <button className="smallBtn" onClick={() => setShowSettings(false)}>Close</button>
            </div>

            <div className="settingsGrid">
              <label>
                Maya name
                <input value={settings.name} onChange={(e) => updateSetting("name", e.target.value)} />
              </label>

              <label>
                Language
                <select value={settings.language} onChange={(e) => updateSetting("language", e.target.value)}>
                  <option>BM + Manglish</option>
                  <option>Bahasa Melayu</option>
                  <option>English</option>
                </select>
              </label>

              <label>
                Voice speed
                <input type="range" min="0.7" max="1.3" step="0.05" value={settings.voiceRate}
                  onChange={(e) => updateSetting("voiceRate", e.target.value)} />
              </label>

              <label className="toggleRow">
                <input type="checkbox" checked={settings.autoSpeak}
                  onChange={(e) => updateSetting("autoSpeak", e.target.checked)} />
                Auto voice reply
              </label>
            </div>

            <label className="memoryBox">
              Long-term memory
              <textarea
                value={memory}
                onChange={(e) => setMemory(e.target.value)}
                placeholder="Contoh: User suka jawapan BM, kerja dalam sales, suka jawapan terus..."
              />
            </label>

            <div className="settingsActions">
              <button className="smallBtn primary" onClick={saveMemory}>💾 Save memory</button>
              <button className="smallBtn" onClick={exportData}>Export backup</button>
              <label className="fileBtn">
                Import backup
                <input type="file" accept=".json,application/json" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
              </label>
              <button className="smallBtn danger" onClick={clearHistory}>Clear history</button>
            </div>
          </aside>
        )}

        <div className="chat" ref={chatRef}>
          {messages.map((message, index) => {
            const text = Array.isArray(message.content)
              ? message.content.find((p) => p.type === "text")?.text || ""
              : message.content;

            const imagePart = Array.isArray(message.content)
              ? message.content.find((p) => p.type === "image_url")?.image_url?.url
              : null;

            return (
              <div key={index} className={`row ${message.role}`}>
                <div className="bubbleWrap">
                  <div className="bubble">
                    {imagePart && <img className="messageImage" src={imagePart} alt={message.imageName || "Attached image"} />}
                    {text && <div>{text}</div>}
                  </div>

                  {message.role === "assistant" && (
                    <button className="speakBtn" onClick={() => speak(text, index)}>
                      {speakingIndex === index ? "⏹ Stop" : "🔊 Listen"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="row assistant">
              <div className="bubble typing">Maya tengah fikir…</div>
            </div>
          )}
        </div>

        {notice && <div className="notice">{notice}</div>}

        {image && (
          <div className="attachmentPreview">
            <img src={image.dataUrl} alt="Preview" />
            <div>
              <b>{image.name}</b>
              <button onClick={() => setImage(null)}>Remove</button>
            </div>
          </div>
        )}

        <form className="composer" onSubmit={sendMessage}>
          <label className="attachBtn" title="Attach image">
            🖼️
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && attachImage(e.target.files[0])} />
          </label>

          <button type="button" className={listening ? "voiceBtn active" : "voiceBtn"} onClick={startVoiceInput} title="Voice input">
            {listening ? "⏹️" : "🎤"}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Maya…"
            autoComplete="off"
          />

          <button type="submit" disabled={loading || (!input.trim() && !image)}>
            {loading ? "..." : "Send"}
          </button>
        </form>

        <div className="conversationActions">
          <button onClick={newConversation}>＋ New chat</button>
          <button onClick={clearHistory}>🧹 Clear</button>
          <span>Memory: <b>{memory ? "ON" : "EMPTY"}</b> · Local persistence</span>
        </div>

        <footer>
          Maya V3 · API keys stay server-side · Mood is simulated software state.
        </footer>
      </section>
    </main>
  );
}
