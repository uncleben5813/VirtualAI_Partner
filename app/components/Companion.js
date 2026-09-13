“use client”;

import { useEffect, useMemo, useRef, useState } from “react”;

const moods = {
happy: { label: “Happy”, emoji: “😊” },
caring: { label: “Caring”, emoji: “❤️” },
playful: { label: “Playful”, emoji: “✨” },
calm: { label: “Calm”, emoji: “🌙” },
upset: { label: “Upset”, emoji: “🥺” },
};

const STORAGE = {
messages: “maya_messages_v3”,
mood: “maya_mood_v3”,
memory: “maya_memory_v3”,
settings: “maya_settings_v3”,
};

const defaultMessage = {
role: “assistant”,
content:
“Hii 😊 Saya Maya. BM, English atau Manglish semua boleh. Apa cerita hari ni?”,
};

const defaultSettings = {
name: “Maya”,
language: “BM + Manglish”,
autoSpeak: false,
voiceRate: 1,
personality: “warm, caring, playful, intelligent”,
};

function safeParse(value, fallback) {
try {
return JSON.parse(value);
} catch {
return fallback;
}
}

function MayaAvatar({ mood, loading, speaking, reacting }) {
const avatarMood = loading ? “thinking” : mood;
const moodInfo = moods[mood] || moods.calm;

return (
<div
className={mayaAvatarWrap mood-${avatarMood} ${ speaking ? "isSpeaking" : "" } ${reacting ? "isReacting" : ""}}
aria-label={Maya ${moodInfo.label}}
>
  <div className="mayaAvatar">
    <div className="mayaHijabBack" />
    <div className="mayaShoulders" />
    <div className="mayaHead">
      <div className="mayaHijab">
        <div className="mayaHijabInner" />
      </div>
      <div className="mayaFace">
        <div className="mayaBrows">
          <span className="brow left" />
          <span className="brow right" />
        </div>
        <div className="mayaEyes">
          <span className="eye left">
            <span className="pupil" />
          </span>
          <span className="eye right">
            <span className="pupil" />
          </span>
        </div>
        <span className="mayaNose" />
        <div className="mayaMouth">
          <span />
        </div>
        <div className="mayaBlush left" />
        <div className="mayaBlush right" />
      </div>
    </div>
    <div className="mayaNeck" />
  </div>
  <div className="mayaMoodBadge">
    <span>{moodInfo.emoji}</span>
    <span>{loading ? "Thinking..." : moodInfo.label}</span>
  </div>
</div>

);
}

export default function Companion() {
const [messages, setMessages] = useState([defaultMessage]);
const [input, setInput] = useState(””);
const [mood, setMood] = useState(“caring”);
const [memory, setMemory] = useState([]);
const [settings, setSettings] = useState(defaultSettings);

const [loading, setLoading] = useState(false);
const [image, setImage] = useState(null);
const [showSettings, setShowSettings] = useState(false);
const [notice, setNotice] = useState(””);

const [listening, setListening] = useState(false);
const [speakingIndex, setSpeakingIndex] = useState(null);
const [reacting, setReacting] = useState(false);

const chatRef = useRef(null);
const fileRef = useRef(null);
const recognitionRef = useRef(null);
const reactTimerRef = useRef(null);

const moodInfo = useMemo(() => moods[mood] || moods.calm, [mood]);

useEffect(() => {
if (typeof window === “undefined”) return;

const savedMessages = safeParse(
  localStorage.getItem(STORAGE.messages),
  null
);
const savedMood = localStorage.getItem(STORAGE.mood);
const savedMemory = safeParse(localStorage.getItem(STORAGE.memory), []);
const savedSettings = safeParse(
  localStorage.getItem(STORAGE.settings),
  null
);
if (Array.isArray(savedMessages) && savedMessages.length) {
  setMessages(savedMessages);
}
if (savedMood && moods[savedMood]) {
  setMood(savedMood);
}
if (Array.isArray(savedMemory)) {
  setMemory(savedMemory);
}
if (savedSettings && typeof savedSettings === "object") {
  setSettings((prev) => ({ ...prev, ...savedSettings }));
}

}, []);

useEffect(() => {
if (typeof window === “undefined”) return;
localStorage.setItem(STORAGE.messages, JSON.stringify(messages));
}, [messages]);

useEffect(() => {
if (typeof window === “undefined”) return;
localStorage.setItem(STORAGE.mood, mood);
}, [mood]);

useEffect(() => {
if (typeof window === “undefined”) return;
localStorage.setItem(STORAGE.memory, JSON.stringify(memory));
}, [memory]);

useEffect(() => {
if (typeof window === “undefined”) return;
localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
}, [settings]);

useEffect(() => {
const el = chatRef.current;
if (!el) return;

requestAnimationFrame(() => {
  el.scrollTo({
    top: el.scrollHeight,
    behavior: "smooth",
  });
});

}, [messages, loading]);

useEffect(() => {
return () => {
if (reactTimerRef.current) clearTimeout(reactTimerRef.current);
if (recognitionRef.current) recognitionRef.current.stop();

  if (typeof window !== "undefined") {
    window.speechSynthesis?.cancel();
  }
};

}, []);

function triggerReaction(duration = 1000) {
setReacting(true);

if (reactTimerRef.current) {
  clearTimeout(reactTimerRef.current);
}
reactTimerRef.current = setTimeout(() => {
  setReacting(false);
}, duration);

}

function startListening() {
if (typeof window === “undefined”) return;

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  setNotice("Voice input tak disokong oleh browser ni.");
  return;
}
if (listening) {
  recognitionRef.current?.stop();
  return;
}
const recognition = new SpeechRecognition();
recognition.lang = "ms-MY";
recognition.continuous = false;
recognition.interimResults = true;
recognition.onstart = () => {
  setListening(true);
  triggerReaction(1500);
};
recognition.onresult = (event) => {
  let transcript = "";
  for (let i = event.resultIndex; i < event.results.length; i++) {
    transcript += event.results[i][0].transcript;
  }
  setInput(transcript);
};
recognition.onerror = () => {
  setListening(false);
  setNotice("Voice input tak dapat digunakan sekarang.");
};
recognition.onend = () => {
  setListening(false);
};
recognitionRef.current = recognition;
recognition.start();

}

function speak(text, index) {
if (typeof window === “undefined”) return;
if (!window.speechSynthesis) return;

window.speechSynthesis.cancel();
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = "ms-MY";
utterance.rate = Number(settings.voiceRate) || 1;
utterance.onstart = () => {
  setSpeakingIndex(index);
  triggerReaction(1200);
};
utterance.onend = () => {
  setSpeakingIndex(null);
};
utterance.onerror = () => {
  setSpeakingIndex(null);
};
window.speechSynthesis.speak(utterance);

}

function handleFile(event) {
const file = event.target.files?.[0];
if (!file) return;

if (!file.type.startsWith("image/")) {
  setNotice("Sila pilih fail gambar.");
  return;
}
if (file.size > 6 * 1024 * 1024) {
  setNotice("Gambar terlalu besar. Maximum 6MB.");
  return;
}
const reader = new FileReader();
reader.onload = () => {
  setImage({
    name: file.name,
    dataUrl: reader.result,
  });
  triggerReaction(900);
};
reader.readAsDataURL(file);
event.target.value = "";

}

async function sendMessage(event) {
event?.preventDefault?.();

const text = input.trim();
if ((!text && !image) || loading) return;
triggerReaction(1400);
const userMessage = {
  role: "user",
  content: text || "Sila tengok gambar ni.",
  ...(image ? { image: image.dataUrl } : {}),
};
const nextMessages = [...messages, userMessage];
setMessages(nextMessages);
setInput("");
setImage(null);
setLoading(true);
try {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: nextMessages.slice(-40),
      mood,
      memory,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data?.text) {
    if (res.status === 429) {
      throw new Error(
        "Groq rate limit. Tunggu sekejap dan cuba lagi."
      );
    }
    throw new Error(data?.error || "Maya tak dapat jawab sekarang.");
  }
  const assistantMessage = {
    role: "assistant",
    content: data.text,
  };
  const assistantIndex = nextMessages.length;
  setMessages((prev) => [...prev, assistantMessage]);
  if (data.mood && moods[data.mood]) {
    setMood(data.mood);
  }
  triggerReaction(1800);
  if (settings.autoSpeak) {
    setTimeout(() => {
      speak(data.text, assistantIndex);
    }, 100);
  }
} catch (error) {
  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      content:
        error?.message ||
        "Maaf, Maya tak dapat sambung sekarang. Cuba lagi.",
      error: true,
    },
  ]);
  setNotice(error?.message || "Ada masalah semasa menghantar mesej.");
} finally {
  setLoading(false);
}

}

function clearChat() {
if (typeof window !== “undefined”) {
window.speechSynthesis?.cancel();
}

setSpeakingIndex(null);
setMessages([defaultMessage]);
setMood("caring");
setNotice("");

}

function exportMemory() {
const payload = {
messages,
mood,
memory,
settings,
exportedAt: new Date().toISOString(),
};

const blob = new Blob([JSON.stringify(payload, null, 2)], {
  type: "application/json",
});
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "maya-memory-backup.json";
a.click();
URL.revokeObjectURL(url);

}

function importMemory(event) {
const file = event.target.files?.[0];
if (!file) return;

const reader = new FileReader();
reader.onload = () => {
  try {
    const data = JSON.parse(reader.result);
    if (Array.isArray(data.messages) && data.messages.length) {
      setMessages(data.messages);
    }
    if (Array.isArray(data.memory)) {
      setMemory(data.memory);
    }
    if (data.mood && moods[data.mood]) {
      setMood(data.mood);
    }
    if (data.settings) {
      setSettings((prev) => ({
        ...prev,
        ...data.settings,
      }));
    }
    setNotice("Memory Maya berjaya diimport.");
  } catch {
    setNotice("Fail memory tak sah.");
  }
};
reader.readAsText(file);
event.target.value = "";

}

return (
Maya AI
Companion
      <div className="topActions">
        <button
          type="button"
          className="iconButton"
          onClick={() => setShowSettings((value) => !value)}
          aria-label="Settings"
        >
          ⚙️
        </button>
        <button
          type="button"
          className="newChatButton"
          onClick={clearChat}
        >
          ＋ New Chat
        </button>
      </div>
    </header>
    <section className="liveAI">
      <div className="liveHeader">
        <div>
          <div className="liveTitle">
            <span className="livePill">
              <span className="livePulse" />
              LIVE AI
            </span>
          </div>
          <h1>Maya</h1>
          <div className="mayaStatus">
            <span className="onlineDot" />
            {loading
              ? "Thinking..."
              : speakingIndex !== null
              ? "Speaking..."
              : listening
              ? "Listening..."
              : "Online"}
          </div>
        </div>
        <MayaAvatar
          mood={mood}
          loading={loading}
          speaking={speakingIndex !== null}
          reacting={reacting || listening}
        />
      </div>
      <div className="liveFooter">
        <div className="moodCurrent">
          <span>{moodInfo.emoji}</span>
          <span>{moodInfo.label}</span>
        </div>
        <div className="moodSelector">
          {Object.entries(moods).map(([id, item]) => (
            <button
              type="button"
              key={id}
              className={mood === id ? "active" : ""}
              onClick={() => {
                setMood(id);
                triggerReaction(800);
              }}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      </div>
    </section>
    {showSettings && (
      <section className="settingsPanel">
        <div className="settingsHeader">
          <div>
            <strong>Maya Settings</strong>
            <span>Customize your companion</span>
          </div>
          <button
            type="button"
            className="closeButton"
            onClick={() => setShowSettings(false)}
          >
            ×
          </button>
        </div>
        <label>
          <span>Name</span>
          <input
            value={settings.name}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Language</span>
          <select
            value={settings.language}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                language: e.target.value,
              }))
            }
          >
            <option>BM + Manglish</option>
            <option>Bahasa Melayu</option>
            <option>English</option>
          </select>
        </label>
        <label>
          <span>Personality</span>
          <select
            value={settings.personality}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                personality: e.target.value,
              }))
            }
          >
            <option>Warm, caring, playful, intelligent</option>
            <option>Calm, helpful, intelligent</option>
            <option>Playful, cheerful, energetic</option>
          </select>
        </label>
        <label className="switchRow">
          <span>Auto voice reply</span>
          <input
            type="checkbox"
            checked={settings.autoSpeak}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                autoSpeak: e.target.checked,
              }))
            }
          />
        </label>
        <label>
          <span>Voice speed</span>
          <input
            type="range"
            min="0.7"
            max="1.3"
            step="0.05"
            value={settings.voiceRate}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                voiceRate: Number(e.target.value),
              }))
            }
          />
        </label>
        <div className="settingsButtons">
          <button type="button" onClick={exportMemory}>
            Export Memory
          </button>
          <label className="fileImportButton">
            Import Memory
            <input
              type="file"
              accept=".json,application/json"
              onChange={importMemory}
            />
          </label>
        </div>
      </section>
    )}
    <section className="chatWindow" ref={chatRef}>
      <div className="chatInner">
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div
              className={`messageRow ${isUser ? "userRow" : "mayaRow"}`}
              key={`${index}-${message.content}`}
            >
              {!isUser && <div className="messageAvatar">M</div>}
              <div className="messageContent">
                {message.image && (
                  <img
                    className="messageImage"
                    src={message.image}
                    alt="Attachment"
                  />
                )}
                <div
                  className={`messageBubble ${
                    isUser ? "userBubble" : "mayaBubble"
                  } ${message.error ? "errorBubble" : ""}`}
                >
                  {message.content}
                </div>
                {!isUser && (
                  <div className="messageMeta">
                    Maya
                    {index === messages.length - 1 && !loading
                      ? " • Just now"
                      : ""}
                  </div>
                )}
                {!isUser && (
                  <button
                    type="button"
                    className="listenButton"
                    onClick={() => speak(message.content, index)}
                  >
                    🔊 Listen
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="messageRow mayaRow">
            <div className="messageAvatar thinkingAvatar">M</div>
            <div className="messageContent">
              <div className="messageBubble mayaBubble typingBubble">
                <span className="typingDot" />
                <span className="typingDot" />
                <span className="typingDot" />
              </div>
              <div className="messageMeta">
                Maya is thinking...
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
    {notice && (
      <div className="notice">
        <span>{notice}</span>
        <button type="button" onClick={() => setNotice("")}>
          ×
        </button>
      </div>
    )}
    {image && (
      <div className="attachmentPreview">
        <img src={image.dataUrl} alt="Preview" />
        <div>
          <strong>{image.name}</strong>
          <span>Ready to send</span>
        </div>
        <button
          type="button"
          onClick={() => setImage(null)}
          aria-label="Remove image"
        >
          ×
        </button>
      </div>
    )}
    <form className="composer" onSubmit={sendMessage}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
      <button
        type="button"
        className="composerIcon"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        aria-label="Attach image"
      >
        ＋
      </button>
      <div className="composerInput">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (e.target.value.trim()) {
              triggerReaction(500);
            }
          }}
          placeholder={
            listening ? "Maya sedang dengar..." : "Message Maya..."
          }
          disabled={loading}
        />
      </div>
      <button
        type="button"
        className={`voiceButton ${listening ? "active" : ""}`}
        onClick={startListening}
        disabled={loading}
        aria-label="Voice input"
      >
        🎤
      </button>
      <button
        type="submit"
        className="sendButton"
        disabled={loading || (!input.trim() && !image)}
        aria-label="Send"
      >
        ➤
      </button>
    </form>
  </section>
</main>

);
}
