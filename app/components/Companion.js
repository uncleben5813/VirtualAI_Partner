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
const expression =
{
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

const messagesEndRef = useRef(null);
const inputRef = useRef(null);
const fileRef = useRef(null);
const recognitionRef = useRef(null);

const currentMood = moods[mood] || moods.calm;

const moodText = useMemo(() => {
if (loading) return “Maya is thinking…”;
if (speaking) return “Maya is speaking…”;
if (listening) return “Listening…”;
if (reacting) return “Maya is reacting…”;
return ${currentMood.emoji} ${currentMood.label};
}, [loading, speaking, listening, reacting, currentMood]);

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
messagesEndRef.current?.scrollIntoView({
behavior: “smooth”,
block: “end”,
});
}, [messages, loading]);

useEffect(() => {
return () => {
try {
recognitionRef.current?.stop();
} catch {}

  try {
    window.speechSynthesis?.cancel();
  } catch {}
};

}, []);

function showNotice(message) {
setNotice(message);

window.clearTimeout(showNotice.timer);
showNotice.timer = window.setTimeout(() => {
  setNotice("");
}, 3500);

}

function triggerReaction(duration = 850) {
setReacting(true);

window.setTimeout(() => {
  setReacting(false);
}, duration);

}

function updateSettings(key, value) {
setSettings((prev) => ({
…prev,
[key]: value,
}));
}

function newChat() {
setMessages([]);
setAttachment(null);
setInput(””);
setMood(“calm”);
setNotice(“New chat started.”);

window.setTimeout(() => {
  inputRef.current?.focus();
}, 50);

}

function clearMemory() {
setMemory([]);
showNotice(“Long-term memory cleared.”);
}

function exportMemory() {
const payload = {
version: 3,
exportedAt: new Date().toISOString(),
memory,
messages,
settings,
mood,
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
showNotice("Backup exported.");

}

function importMemory(event) {
const file = event.target.files?.[0];

if (!file) return;
const reader = new FileReader();
reader.onload = () => {
  try {
    const data = JSON.parse(reader.result);
    if (Array.isArray(data.memory)) {
      setMemory(data.memory);
    }
    if (Array.isArray(data.messages)) {
      setMessages(data.messages);
    }
    if (data.settings && typeof data.settings === "object") {
      setSettings({
        ...defaultSettings,
        ...data.settings,
      });
    }
    if (typeof data.mood === "string" && moods[data.mood]) {
      setMood(data.mood);
    }
    showNotice("Backup imported.");
  } catch {
    showNotice("Invalid backup file.");
  }
};
reader.readAsText(file);
event.target.value = "";

}

function speakText(text) {
if (
typeof window === “undefined” ||
!(“speechSynthesis” in window) ||
!text
) {
return;
}

window.speechSynthesis.cancel();
const utterance = new SpeechSynthesisUtterance(text);
utterance.rate = Number(settings.voiceRate) || 1;
utterance.pitch = 1.04;
utterance.volume = 1;
const voices = window.speechSynthesis.getVoices();
const preferredVoice =
  voices.find((voice) =>
    /en-MY|ms-MY|en-SG|en-US|en-GB/i.test(voice.lang)
  ) || voices[0];
if (preferredVoice) {
  utterance.voice = preferredVoice;
}
utterance.onstart = () => {
  setSpeaking(true);
  triggerReaction(500);
};
utterance.onend = () => {
  setSpeaking(false);
};
utterance.onerror = () => {
  setSpeaking(false);
};
window.speechSynthesis.speak(utterance);

}

function startVoiceInput() {
if (typeof window === “undefined”) return;

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  showNotice("Voice input is not supported on this browser.");
  return;
}
if (listening) {
  try {
    recognitionRef.current?.stop();
  } catch {}
  setListening(false);
  return;
}
const recognition = new SpeechRecognition();
recognition.lang = "ms-MY";
recognition.interimResults = true;
recognition.continuous = false;
recognition.maxAlternatives = 1;
recognition.onstart = () => {
  setListening(true);
  triggerReaction(700);
};
recognition.onresult = (event) => {
  let finalText = "";
  let interimText = "";
  for (
    let i = event.resultIndex;
    i < event.results.length;
    i += 1
  ) {
    const transcript = event.results[i][0]?.transcript || "";
    if (event.results[i].isFinal) {
      finalText += transcript;
    } else {
      interimText += transcript;
    }
  }
  const text = finalText || interimText;
  if (text) {
    setInput(text);
  }
};
recognition.onerror = () => {
  setListening(false);
  showNotice("Voice input failed.");
};
recognition.onend = () => {
  setListening(false);
};
recognitionRef.current = recognition;
try {
  recognition.start();
} catch {
  setListening(false);
}

}

function handleFileChange(event) {
const file = event.target.files?.[0];

if (!file) return;
if (!file.type.startsWith("image/")) {
  showNotice("Please select an image.");
  event.target.value = "";
  return;
}
if (file.size > 6 * 1024 * 1024) {
  showNotice("Image must be smaller than 6MB.");
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
  triggerReaction(700);
};
reader.onerror = () => {
  showNotice("Could not read image.");
};
reader.readAsDataURL(file);
event.target.value = "";

}

function removeAttachment() {
setAttachment(null);
}

async function sendMessage() {
const text = input.trim();

if ((!text && !attachment) || loading) return;
const userMessage = {
  id: makeId(),
  role: "user",
  content: text || "Please look at this image.",
  image: attachment?.data || null,
  createdAt: Date.now(),
};
const nextMessages = [...messages, userMessage];
setMessages(nextMessages);
setInput("");
setAttachment(null);
setLoading(true);
triggerReaction(1000);
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    if (res.status === 429) {
      throw new Error(
        data.error ||
          "Too many requests. Please wait a moment."
      );
    }
    throw new Error(
      data.error || "Maya could not reply right now."
    );
  }
  const assistantMessage = {
    id: makeId(),
    role: "assistant",
    content:
      data.text ||
      "Sorry, I could not generate a response.",
    createdAt: Date.now(),
  };
  setMessages((prev) => [...prev, assistantMessage]);
  if (data.mood && moods[data.mood]) {
    setMood(data.mood);
  }
  if (Array.isArray(data.memory)) {
    setMemory(data.memory);
  }
  triggerReaction(900);
  if (settings.autoSpeak && data.text) {
    window.setTimeout(() => {
      speakText(data.text);
    }, 100);
  }
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : "Something went wrong.";
  showNotice(message);
  triggerReaction(500);
} finally {
  setLoading(false);
  window.setTimeout(() => {
    inputRef.current?.focus();
  }, 50);
}

}

function handleKeyDown(event) {
if (event.key === “Enter” && !event.shiftKey) {
event.preventDefault();
sendMessage();
}
}

function handleManualMood(nextMood) {
if (!moods[nextMood]) return;

setMood(nextMood);
triggerReaction(700);

}

return (
M
        <div>
          <div className="brandName">
            Maya AI
          </div>
          <div className="brandStatus">
            <span className="onlineDot" />
            AI Companion
          </div>
        </div>
      </div>
      <div className="topActions">
        <button
          type="button"
          className="iconButton"
          onClick={newChat}
          title="New chat"
        >
          +
        </button>
        <button
          type="button"
          className="iconButton"
          onClick={() => setShowSettings((value) => !value)}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </header>
    <section className="liveSection">
      <div className="liveHeader">
        <div>
          <div className="liveTitle">
            LIVE AI
          </div>
          <div className="liveSubtitle">
            {moodText}
          </div>
        </div>
        <div className="moodBadge">
          {currentMood.emoji} {currentMood.label}
        </div>
      </div>
      <div className="avatarStage">
        <MayaAvatar
          mood={mood}
          loading={loading}
          speaking={speaking}
          reacting={reacting || listening}
        />
        <div className="avatarStatus">
          <span className="statusPulse" />
          {loading
            ? "Thinking"
            : speaking
            ? "Speaking"
            : listening
            ? "Listening"
            : "Online"}
        </div>
      </div>
      <div className="moodSelector">
        {Object.entries(moods).map(([id, item]) => (
          <button
            type="button"
            key={id}
            className={`moodButton ${
              mood === id ? "active" : ""
            }`}
            onClick={() => handleManualMood(id)}
          >
            <span>{item.emoji}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </div>
    </section>
    {showSettings && (
      <section className="settingsPanel">
        <div className="settingsHeader">
          <div>
            <h2>Maya Settings</h2>
            <p>Personalise Maya&apos;s behaviour.</p>
          </div>
          <button
            type="button"
            className="closeButton"
            onClick={() => setShowSettings(false)}
          >
            ×
          </button>
        </div>
        <div className="settingsGrid">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={settings.name}
              onChange={(event) =>
                updateSettings(
                  "name",
                  event.target.value
                )
              }
            />
          </label>
          <label>
            <span>Language</span>
            <select
              value={settings.language}
              onChange={(event) =>
                updateSettings(
                  "language",
                  event.target.value
                )
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
              onChange={(event) =>
                updateSettings(
                  "personality",
                  event.target.value
                )
              }
            >
              <option>
                warm, caring, playful and intelligent
              </option>
              <option>
                calm, mature, helpful and intelligent
              </option>
              <option>
                cheerful, playful and friendly
              </option>
              <option>
                concise, practical and direct
              </option>
            </select>
          </label>
          <label>
            <span>Voice speed</span>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.05"
              value={settings.voiceRate}
              onChange={(event) =>
                updateSettings(
                  "voiceRate",
                  Number(event.target.value)
                )
              }
            />
          </label>
          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={settings.autoSpeak}
              onChange={(event) =>
                updateSettings(
                  "autoSpeak",
                  event.target.checked
                )
              }
            />
            <span>Automatically speak Maya&apos;s replies</span>
          </label>
        </div>
        <div className="settingsActions">
          <button
            type="button"
            className="secondaryButton"
            onClick={exportMemory}
          >
            Export Backup
          </button>
          <button
            type="button"
            className="secondaryButton"
            onClick={() => fileRef.current?.click()}
          >
            Import Backup
          </button>
          <button
            type="button"
            className="dangerButton"
            onClick={clearMemory}
          >
            Clear Memory
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importMemory}
          />
        </div>
      </section>
    )}
    <section className="chatSection">
      <div className="chatHeader">
        <div>
          <strong>Conversation</strong>
          <span>
            {messages.length} message
            {messages.length === 1 ? "" : "s"}
          </span>
        </div>
        <button
          type="button"
          className="newChatButton"
          onClick={newChat}
        >
          New chat
        </button>
      </div>
      <div className="chatScroll">
        {messages.length === 0 && (
          <div className="emptyChat">
            <div className="emptyIcon">✨</div>
            <h2>
              Hi, I&apos;m Maya.
            </h2>
            <p>
              Start a conversation. I can remember useful
              information, react to the conversation and
              help you with different tasks.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`messageRow ${
              message.role === "user"
                ? "userRow"
                : "mayaRow"
            }`}
          >
            <div
              className={`messageBubble ${
                message.role === "user"
                  ? "userBubble"
                  : "mayaBubble"
              }`}
            >
              {message.image && (
                <img
                  src={message.image}
                  alt="Uploaded"
                  className="messageImage"
                />
              )}
              {message.content && (
                <div className="messageText">
                  {message.content}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="messageRow mayaRow">
            <div className="messageBubble mayaBubble typingBubble">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </section>
    {notice && (
      <div className="noticeBar">
        {notice}
      </div>
    )}
    {attachment && (
      <div className="attachmentBar">
        <div className="attachmentPreview">
          <img
            src={attachment.data}
            alt={attachment.name}
          />
          <div>
            <strong>{attachment.name}</strong>
            <small>Ready to send</small>
          </div>
        </div>
        <button
          type="button"
          onClick={removeAttachment}
          className="removeAttachment"
        >
          ×
        </button>
      </div>
    )}
    <section className="composer">
      <button
        type="button"
        className="composerButton"
        onClick={() => fileRef.current?.click()}
        title="Attach image"
      >
        ＋
      </button>
      <textarea
        ref={inputRef}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          listening
            ? "Listening..."
            : "Message Maya..."
        }
        rows={1}
        disabled={loading}
      />
      <button
        type="button"
        className={`composerButton ${
          listening ? "recording" : ""
        }`}
        onClick={startVoiceInput}
        title="Voice input"
        disabled={loading}
      >
        {listening ? "●" : "🎙"}
      </button>
      <button
        type="button"
        className="sendButton"
        onClick={sendMessage}
        disabled={
          loading ||
          (!input.trim() && !attachment)
        }
      >
        {loading ? "..." : "↑"}
      </button>
    </section>
  </section>
</main>

);
}
