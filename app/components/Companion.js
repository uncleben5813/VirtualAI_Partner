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

const defaultSettings = {
name: “Maya”,
language: “BM + Manglish”,
autoSpeak: false,
voiceRate: 1,
personality: “warm, caring, playful and intelligent”,
};

function safeRead(key, fallback) {
if (typeof window === “undefined”) return fallback;

try {
const value = localStorage.getItem(key);
return value ? JSON.parse(value) : fallback;
} catch {
return fallback;
}
}

function safeWrite(key, value) {
try {
localStorage.setItem(key, JSON.stringify(value));
} catch {}
}

function makeId() {
return ${Date.now()}-${Math.random().toString(36).slice(2)};
}

function MayaAvatar({ mood, loading, speaking, reacting }) {
const expression = {
happy: “happy”,
caring: “caring”,
playful: “playful”,
calm: “calm”,
upset: “upset”,
}[mood] || “calm”;

return (
<div
className={mayaVisual maya-${expression} ${ loading ? "isThinking" : "" } ${speaking ? "isSpeaking" : ""} ${ reacting ? "isReacting" : "" }}
>
  <div className="mayaHead">
    <div className="mayaHairBack" />
    <div className="mayaHijabOuter">
      <div className="mayaHijabHighlight" />
      <div className="mayaHijabShadow" />
    </div>
    <div className="mayaFace">
      <div className="mayaForeheadGlow" />
      <div className="mayaBrows">
        <span className="brow left" />
        <span className="brow right" />
      </div>
      <div className="mayaEyes">
        <span className="eye left">
          <i />
        </span>
        <span className="eye right">
          <i />
        </span>
      </div>
      <div className="mayaNose">
        <span />
      </div>
      <div className="mayaBlush left" />
      <div className="mayaBlush right" />
      <div className="mayaMouth">
        <span />
      </div>
    </div>
    <div className="mayaNeck" />
    <div className="mayaShoulders" />
  </div>
  {loading && (
    <div className="mayaThinking">
      <span />
      <span />
      <span />
    </div>
  )}
  {speaking && (
    <div className="mayaVoiceRing">
      <i />
      <i />
      <i />
    </div>
  )}
</div>

);
}

export default function Companion() {
const [messages, setMessages] = useState(() =>
safeRead(STORAGE.messages, [])
);

const [mood, setMood] = useState(() =>
safeRead(STORAGE.mood, “calm”)
);

const [memory, setMemory] = useState(() =>
safeRead(STORAGE.memory, [])
);

const [settings, setSettings] = useState(() =>
safeRead(STORAGE.settings, defaultSettings)
);

const [input, setInput] = useState(””);
const [loading, setLoading] = useState(false);
const [reacting, setReacting] = useState(false);
const [speaking, setSpeaking] = useState(false);
const [listening, setListening] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [attachment, setAttachment] = useState(null);
const [notice, setNotice] = useState(””);

const chatRef = useRef(null);
const inputRef = useRef(null);
const fileRef = useRef(null);
const recognitionRef = useRef(null);
const reactionTimer = useRef(null);

const currentMood = moods[mood] || moods.calm;

useEffect(() => {
safeWrite(STORAGE.messages, messages);
}, [messages]);

useEffect(() => {
safeWrite(STORAGE.mood, mood);
}, [mood]);

useEffect(() => {
safeWrite(STORAGE.memory, memory);
}, [memory]);

useEffect(() => {
safeWrite(STORAGE.settings, settings);
}, [settings]);

useEffect(() => {
const el = chatRef.current;
if (!el) return;

requestAnimationFrame(() => {
  el.scrollTop = el.scrollHeight;
});

}, [messages, loading]);

useEffect(() => {
return () => {
if (reactionTimer.current) {
clearTimeout(reactionTimer.current);
}

  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (recognitionRef.current) {
    try {
      recognitionRef.current.stop();
    } catch {}
  }
};

}, []);

const triggerReaction = (duration = 1000) => {
setReacting(true);

if (reactionTimer.current) {
  clearTimeout(reactionTimer.current);
}
reactionTimer.current = setTimeout(() => {
  setReacting(false);
}, duration);

};

const updateSetting = (key, value) => {
setSettings((prev) => ({
…prev,
[key]: value,
}));
};

const clearHistory = () => {
setMessages([]);
setNotice(“Conversation cleared.”);
triggerReaction(700);
};

const newChat = () => {
setMessages([]);
setAttachment(null);
setInput(””);
setMood(“calm”);
setNotice(“New conversation started.”);
triggerReaction(700);
setTimeout(() => inputRef.current?.focus(), 50);
};

const exportMemory = () => {
try {
const payload = {
exportedAt: new Date().toISOString(),
messages,
memory,
mood,
settings,
};

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "maya-memory-backup.json";
  a.click();
  URL.revokeObjectURL(url);
  setNotice("Memory exported.");
} catch {
  setNotice("Unable to export memory.");
}

};

const importMemory = (event) => {
const file = event.target.files?.[0];
if (!file) return;

const reader = new FileReader();
reader.onload = () => {
  try {
    const data = JSON.parse(reader.result);
    if (Array.isArray(data.messages)) {
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
    setNotice("Memory imported successfully.");
    triggerReaction(900);
  } catch {
    setNotice("Invalid memory file.");
  }
};
reader.readAsText(file);
event.target.value = "";

};

const speakText = (text) => {
if (
typeof window === “undefined” ||
!window.speechSynthesis ||
!text
) {
return;
}

window.speechSynthesis.cancel();
const clean = text
  .replace(/\*\*/g, "")
  .replace(/[*_#`]/g, "")
  .trim();
const utterance = new SpeechSynthesisUtterance(clean);
utterance.lang = "ms-MY";
utterance.rate = Number(settings.voiceRate) || 1;
utterance.pitch = 1.04;
const voices = window.speechSynthesis.getVoices();
const preferred =
  voices.find((v) => /Malay|Malaysia|ms-MY/i.test(v.lang)) ||
  voices.find((v) => /female/i.test(v.name));
if (preferred) {
  utterance.voice = preferred;
}
utterance.onstart = () => {
  setSpeaking(true);
  triggerReaction(100000);
};
utterance.onend = () => {
  setSpeaking(false);
  setReacting(false);
};
utterance.onerror = () => {
  setSpeaking(false);
  setReacting(false);
};
window.speechSynthesis.speak(utterance);

};

const startListening = () => {
if (typeof window === “undefined”) return;

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  setNotice("Voice input tidak disokong oleh browser ini.");
  return;
}
if (recognitionRef.current) {
  try {
    recognitionRef.current.stop();
  } catch {}
}
const recognition = new SpeechRecognition();
recognition.lang = "ms-MY";
recognition.continuous = false;
recognition.interimResults = true;
recognition.onstart = () => {
  setListening(true);
  triggerReaction(100000);
};
recognition.onresult = (event) => {
  let transcript = "";
  for (
    let i = event.resultIndex;
    i < event.results.length;
    i++
  ) {
    transcript += event.results[i][0].transcript;
  }
  setInput(transcript);
};
recognition.onerror = () => {
  setListening(false);
  setReacting(false);
  setNotice("Voice input tidak dapat digunakan sekarang.");
};
recognition.onend = () => {
  setListening(false);
  setReacting(false);
};
recognitionRef.current = recognition;
recognition.start();

};

const stopListening = () => {
try {
recognitionRef.current?.stop();
} catch {}

setListening(false);
setReacting(false);

};

const handleTyping = (value) => {
setInput(value);

if (value.trim()) {
  triggerReaction(650);
}

};

const handleFile = (event) => {
const file = event.target.files?.[0];
if (!file) return;

if (file.size > 6 * 1024 * 1024) {
  setNotice("Image terlalu besar. Maximum 6MB.");
  event.target.value = "";
  return;
}
if (!file.type.startsWith("image/")) {
  setNotice("Sila pilih image.");
  event.target.value = "";
  return;
}
const reader = new FileReader();
reader.onload = () => {
  setAttachment({
    name: file.name,
    type: file.type,
    data: reader.result,
  });
  triggerReaction(900);
};
reader.readAsDataURL(file);
event.target.value = "";

};

const sendMessage = async () => {
const text = input.trim();

if ((!text && !attachment) || loading) return;
const userContent = text || "Please look at this image.";
const userMessage = {
  id: makeId(),
  role: "user",
  content: userContent,
  image: attachment?.data || null,
  createdAt: Date.now(),
};
const nextMessages = [...messages, userMessage];
setMessages(nextMessages);
setInput("");
setAttachment(null);
setLoading(true);
triggerReaction(100000);
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
      settings,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(
      data?.error || "Maya could not respond."
    );
  }
  const assistantMessage = {
    id: makeId(),
    role: "assistant",
    content: data.text || "Maaf, Maya tak dapat jawab sekarang.",
    createdAt: Date.now(),
  };
  setMessages((prev) => [...prev, assistantMessage]);
  if (data.mood && moods[data.mood]) {
    setMood(data.mood);
  }
  if (Array.isArray(data.memory)) {
    setMemory(data.memory);
  }
  triggerReaction(1400);
  if (settings.autoSpeak && data.text) {
    setTimeout(() => {
      speakText(data.text);
    }, 150);
  }
} catch (error) {
  const errorMessage = {
    id: makeId(),
    role: "assistant",
    content:
      error?.message ||
      "Maaf, berlaku masalah semasa menghubungi Maya.",
    createdAt: Date.now(),
    error: true,
  };
  setMessages((prev) => [...prev, errorMessage]);
  triggerReaction(1200);
} finally {
  setLoading(false);
}

};

const handleKeyDown = (event) => {
if (event.key === “Enter” && !event.shiftKey) {
event.preventDefault();
sendMessage();
}
};

const moodOptions = useMemo(
() => Object.entries(moods),
[]
);

return (
    <header className="mayaTopbar">
      <div className="mayaBrand">
        <div className="mayaBrandAvatar">
          <MayaAvatar
            mood={mood}
            loading={false}
            speaking={false}
            reacting={false}
          />
        </div>
        <div>
          <div className="mayaBrandName">
            {settings.name || "Maya"}
          </div>
          <div className="mayaOnline">
            <span />
            AI Online
          </div>
        </div>
      </div>
      <div className="mayaTopActions">
        <button
          className="iconButton"
          onClick={newChat}
          title="New chat"
        >
          ＋
        </button>
        <button
          className="iconButton"
          onClick={() =>
            setShowSettings((value) => !value)
          }
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
    <section className="mayaLiveSection">
      <div className="liveHeader">
        <div>
          <span className="liveDot" />
          <strong>LIVE AI</strong>
        </div>
        <span className="liveStatus">
          {listening
            ? "Listening..."
            : speaking
            ? "Speaking..."
            : loading
            ? "Thinking..."
            : "Ready"}
        </span>
      </div>
      <div className="mayaStage">
        <MayaAvatar
          mood={mood}
          loading={loading}
          speaking={speaking}
          reacting={reacting}
        />
        <div className="mayaMoodBadge">
          <span>{currentMood.emoji}</span>
          {currentMood.label}
        </div>
      </div>
      <div className="moodSelector">
        {moodOptions.map(([id, value]) => (
          <button
            key={id}
            className={mood === id ? "active" : ""}
            onClick={() => {
              setMood(id);
              triggerReaction(700);
            }}
          >
            <span>{value.emoji}</span>
            {value.label}
          </button>
        ))}
      </div>
    </section>
    {showSettings && (
      <aside className="settingsPanel">
        <div className="settingsTitle">
          <div>
            <strong>Maya Settings</strong>
            <small>Personality & behaviour</small>
          </div>
          <button
            className="closeSettings"
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
              updateSetting("name", e.target.value)
            }
          />
        </label>
        <label>
          <span>Language</span>
          <select
            value={settings.language}
            onChange={(e) =>
              updateSetting("language", e.target.value)
            }
          >
            <option>BM + Manglish</option>
            <option>Bahasa Melayu</option>
            <option>English</option>
          </select>
        </label>
        <label>
          <span>Personality</span>
          <textarea
            value={settings.personality}
            onChange={(e) =>
              updateSetting(
                "personality",
                e.target.value
              )
            }
          />
        </label>
        <label className="rangeLabel">
          <span>Voice speed</span>
          <input
            type="range"
            min="0.7"
            max="1.3"
            step="0.05"
            value={settings.voiceRate}
            onChange={(e) =>
              updateSetting(
                "voiceRate",
                Number(e.target.value)
              )
            }
          />
        </label>
        <label className="checkboxLabel">
          <input
            type="checkbox"
            checked={settings.autoSpeak}
            onChange={(e) =>
              updateSetting(
                "autoSpeak",
                e.target.checked
              )
            }
          />
          <span>Auto voice reply</span>
        </label>
        <div className="settingsButtons">
          <button onClick={exportMemory}>
            Export Memory
          </button>
          <label className="fileImportButton">
            Import Memory
            <input
              type="file"
              accept=".json,application/json"
              onChange={importMemory}
              hidden
            />
          </label>
          <button
            className="dangerButton"
            onClick={clearHistory}
          >
            Clear Chat
          </button>
        </div>
      </aside>
    )}
    <section
      className="mayaChat"
      ref={chatRef}
    >
      {messages.length === 0 ? (
        <div className="mayaWelcome">
          <div className="welcomeIcon">✨</div>
          <h2>Hi, I&apos;m Maya</h2>
          <p>
            Cakap je macam biasa. Maya akan cuba faham
            context, mood dan conversation kau.
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`messageRow ${message.role}`}
          >
            {message.role === "assistant" && (
              <div className="messageAvatar">
                <MayaAvatar
                  mood={mood}
                  loading={false}
                  speaking={false}
                  reacting={false}
                />
              </div>
            )}
            <div
              className={`messageBubble ${
                message.error ? "errorBubble" : ""
              }`}
            >
              {message.image && (
                <img
                  src={message.image}
                  alt="Attached"
                  className="messageImage"
                />
              )}
              <div className="messageText">
                {message.content}
              </div>
            </div>
          </div>
        ))
      )}
      {loading && (
        <div className="messageRow assistant">
          <div className="messageAvatar">
            <MayaAvatar
              mood={mood}
              loading
              speaking={false}
              reacting
            />
          </div>
          <div className="messageBubble thinkingBubble">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </section>
    {notice && (
      <div
        className="mayaNotice"
        onClick={() => setNotice("")}
      >
        {notice}
      </div>
    )}
    {attachment && (
      <div className="attachmentPreview">
        <img
          src={attachment.data}
          alt={attachment.name}
        />
        <div>
          <strong>{attachment.name}</strong>
          <small>Ready to send</small>
        </div>
        <button
          onClick={() => setAttachment(null)}
        >
          ×
        </button>
      </div>
    )}
    <footer className="mayaComposer">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        hidden
      />
      <button
        className="composerButton"
        onClick={() => fileRef.current?.click()}
        title="Attach image"
      >
        ＋
      </button>
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) =>
          handleTyping(e.target.value)
        }
        onKeyDown={handleKeyDown}
        placeholder={
          listening
            ? "Maya sedang dengar..."
            : "Message Maya..."
        }
        rows={1}
      />
      <button
        className={`composerButton micButton ${
          listening ? "active" : ""
        }`}
        onClick={
          listening
            ? stopListening
            : startListening
        }
        title="Voice input"
      >
        {listening ? "■" : "🎤"}
      </button>
      <button
        className="sendButton"
        onClick={sendMessage}
        disabled={
          loading ||
          (!input.trim() && !attachment)
        }
      >
        ➤
      </button>
    </footer>
  </section>
</main>

);
}
