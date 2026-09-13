"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE = {
  messages: "maya_messages_v3",
  mood: "maya_mood_v3",
  memory: "maya_memory_v3",
  settings: "maya_settings_v3",
};

const moods = {
  happy: { label: "Happy", emoji: "😊" },
  caring: { label: "Caring", emoji: "❤️" },
  playful: { label: "Playful", emoji: "✨" },
  calm: { label: "Calm", emoji: "🌙" },
  upset: { label: "Upset", emoji: "🥺" },
};

const defaultSettings = {
  name: "Maya",
  personality:
    "Warm, caring, friendly, natural and emotionally aware. Speak naturally like a supportive AI companion.",
  voiceEnabled: true,
  autoSpeak: false,
};

const defaultMessage = {
  role: "assistant",
  content:
    "Hi, I'm Maya. 😊 I'm ready to chat with you. Tell me what's on your mind.",
  createdAt: Date.now(),
};

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return safeParse(value, fallback);
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage errors.
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getMoodFromText(text) {
  const value = String(text || "").toLowerCase();

  if (
    /haha|lol|😂|🤣|seronok|best|happy|gembira|lawak|kelakar|nice|yay/.test(
      value
    )
  ) {
    return "happy";
  }

  if (
    /sayang|rindu|terima kasih|thanks|thank you|jaga|risau|care|support/.test(
      value
    )
  ) {
    return "caring";
  }

  if (
    /hehe|😉|😏|main-main|gurau|joke|fun|usik|nakal/.test(value)
  ) {
    return "playful";
  }

  if (
    /sedih|down|penat|stress|stressed|tak okay|tak okey|masalah|susah|risau/.test(
      value
    )
  ) {
    return "caring";
  }

  if (/marah|geram|angry|annoyed|benci|menyampah/.test(value)) {
    return "upset";
  }

  return "calm";
}

export default function Companion() {
  const [messages, setMessages] = useState([defaultMessage]);
  const [mood, setMood] = useState("calm");
  const [memory, setMemory] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);

  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [reaction, setReaction] = useState("calm");
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  const currentMood = useMemo(() => {
    return moods[mood] || moods.calm;
  }, [mood]);

  useEffect(() => {
    const storedMessages = loadStorage(STORAGE.messages, null);
    const storedMood = loadStorage(STORAGE.mood, null);
    const storedMemory = loadStorage(STORAGE.memory, []);
    const storedSettings = loadStorage(STORAGE.settings, null);

    if (Array.isArray(storedMessages) && storedMessages.length > 0) {
      setMessages(storedMessages);
    }

    if (typeof storedMood === "string" && moods[storedMood]) {
      setMood(storedMood);
    }

    if (Array.isArray(storedMemory)) {
      setMemory(storedMemory);
    }

    if (storedSettings && typeof storedSettings === "object") {
      setSettings({
        ...defaultSettings,
        ...storedSettings,
      });
    }
  }, []);

  useEffect(() => {
    saveStorage(STORAGE.messages, messages);
  }, [messages]);

  useEffect(() => {
    saveStorage(STORAGE.mood, mood);
  }, [mood]);

  useEffect(() => {
    saveStorage(STORAGE.memory, memory);
  }, [memory]);

  useEffect(() => {
    saveStorage(STORAGE.settings, settings);
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function setTemporaryReaction(nextReaction, duration = 1800) {
    setReaction(nextReaction);

    window.setTimeout(() => {
      setReaction("calm");
    }, duration);
  }

  function updateMood(nextMood) {
    if (!moods[nextMood]) return;
    setMood(nextMood);
  }

  function handleTyping(value) {
    setInput(value);

    if (value.trim()) {
      setTemporaryReaction("typing", 1200);
    } else {
      setReaction("calm");
    }
  }

  function speakText(text) {
    if (!settings.voiceEnabled) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const clean = String(text || "").trim();

    if (!clean) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);

    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setTemporaryReaction("speaking", 1000);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setReaction("calm");
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setReaction("calm");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setReaction("calm");
  }

  function toggleVoiceInput() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported by this browser.");
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}

      setIsListening(false);
      setReaction("calm");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTemporaryReaction("listening", 3000);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setReaction("calm");
    };

    recognition.onend = () => {
      setIsListening(false);
      setReaction("calm");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setReaction("calm");
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("Image is too large. Please choose an image below 8MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImage({
        name: file.name,
        type: file.type,
        data: reader.result,
      });

      setTemporaryReaction("image", 1800);
    };

    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    setReaction("calm");
  }

  function addMemoryFromConversation(userText, assistantText) {
    const text = `${userText} ${assistantText}`.trim();

    if (!text) return;

    const memoryKeywords =
      /my name|nama saya|nama aku|i like|i love|saya suka|aku suka|favorite|fav|kerja|work|business|projek|project|remember|ingat/i;

    if (!memoryKeywords.test(userText)) return;

    const newMemory = {
      id: createId(),
      text: userText.trim(),
      createdAt: Date.now(),
    };

    setMemory((previous) => {
      const exists = previous.some(
        (item) =>
          String(item.text || "").toLowerCase() ===
          newMemory.text.toLowerCase()
      );

      if (exists) return previous;

      return [...previous.slice(-49), newMemory];
    });
  }

  async function sendMessage() {
    const text = input.trim();

    if ((!text && !image) || isLoading) return;

    const userMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      ...(image
        ? {
            image: {
              name: image.name,
              type: image.type,
              data: image.data,
            },
          }
        : {}),
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setImage(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    setIsLoading(true);
    setTemporaryReaction("thinking", 5000);

    const localMood = getMoodFromText(text);

    if (localMood !== "calm") {
      updateMood(localMood);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((item) => ({
            role: item.role,
            content: item.content,
            ...(item.image
              ? {
                  image: item.image,
                }
              : {}),
          })),
          memory,
          mood,
          settings,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Unable to get a response from Maya.");
      }

      const assistantText =
        typeof data.text === "string" && data.text.trim()
          ? data.text.trim()
          : "Sorry, I couldn't generate a response right now.";

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        createdAt: Date.now(),
      };

      setMessages((previous) => [...previous, assistantMessage]);

      if (data.mood && moods[data.mood]) {
        updateMood(data.mood);
      } else {
        updateMood(getMoodFromText(assistantText));
      }

      setTemporaryReaction("happy", 2200);

      addMemoryFromConversation(text, assistantText);

      if (settings.autoSpeak && settings.voiceEnabled) {
        window.setTimeout(() => {
          speakText(assistantText);
        }, 150);
      }
    } catch (error) {
      const errorMessage = {
        id: createId(),
        role: "assistant",
        content:
          error?.message ||
          "Something went wrong while connecting to Maya. Please try again.",
        createdAt: Date.now(),
        isError: true,
      };

      setMessages((previous) => [...previous, errorMessage]);
      setTemporaryReaction("upset", 2200);
    } finally {
      setIsLoading(false);

      window.setTimeout(() => {
        setReaction("calm");
      }, 2400);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function newChat() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Start a new chat? Your saved long-term memory will remain."
      );

      if (!confirmed) return;
    }

    setMessages([defaultMessage]);
    setMood("calm");
    setReaction("calm");
    setInput("");
    setImage(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function clearEverything() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Clear chat history and Maya memory?"
      );

      if (!confirmed) return;
    }

    setMessages([defaultMessage]);
    setMemory([]);
    setMood("calm");
    setReaction("calm");
    setInput("");
    setImage(null);

    localStorage.removeItem(STORAGE.messages);
    localStorage.removeItem(STORAGE.memory);
    localStorage.removeItem(STORAGE.mood);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function exportMemory() {
    if (typeof window === "undefined") return;

    const payload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      memory,
      messages,
      mood,
      settings,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "maya-memory-backup.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  function importMemory(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);

        if (Array.isArray(imported.memory)) {
          setMemory(imported.memory);
        }

        if (Array.isArray(imported.messages) && imported.messages.length) {
          setMessages(imported.messages);
        }

        if (imported.mood && moods[imported.mood]) {
          setMood(imported.mood);
        }

        if (imported.settings) {
          setSettings({
            ...defaultSettings,
            ...imported.settings,
          });
        }

        alert("Maya memory imported successfully.");
      } catch {
        alert("Invalid Maya backup file.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  function updateSetting(key, value) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  const reactionLabel = {
    calm: "Here with you",
    typing: "I'm watching...",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
    happy: "😊 Feeling good",
    image: "Looking at your image...",
    upset: "I'm here...",
  };

  return (
    <main className="companionApp">
      <section className="companionShell">
        <header className="topBar">
          <div className="brandArea">
            <div className="brandAvatar">
              <span>✦</span>
            </div>

            <div>
              <div className="brandName">{settings.name}</div>

              <div className="brandStatus">
                <span className="onlineDot" />
                AI companion
              </div>
            </div>
          </div>

          <div className="topActions">
            <button
              type="button"
              className="iconButton"
              onClick={() => setShowSettings((value) => !value)}
              aria-label="Settings"
              title="Settings"
            >
              ⚙️
            </button>

            <button
              type="button"
              className="iconButton"
              onClick={newChat}
              aria-label="New chat"
              title="New chat"
            >
              ＋
            </button>
          </div>
        </header>

        <section className="liveAiCard">
          <div className="mayaVisual">
            <div className={`mayaFace mood-${mood} reaction-${reaction}`}>
              <div className="mayaHair" />

              <div className="mayaHead">
                <div className="mayaForehead" />

                <div className="mayaEyes">
                  <span className="mayaEye left">
                    <span className="mayaPupil" />
                  </span>

                  <span className="mayaEye right">
                    <span className="mayaPupil" />
                  </span>
                </div>

                <div className="mayaNose" />

                <div
                  className={`mayaMouth ${
                    isSpeaking ? "mouthSpeaking" : ""
                  }`}
                />

                <div className="mayaCheek left" />
                <div className="mayaCheek right" />
              </div>
            </div>
          </div>

          <div className="liveAiInfo">
            <div className="liveAiHeader">
              <span className="liveBadge">
                <span className="livePulse" />
                LIVE AI
              </span>

              <span className="moodBadge">
                {currentMood.emoji} {currentMood.label}
              </span>
            </div>

            <div className="liveAiName">{settings.name}</div>

            <div className="liveAiReaction">
              {reactionLabel[reaction] || reactionLabel.calm}
            </div>

            <div className="liveAiBars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        {showSettings && (
          <section className="settingsPanel">
            <div className="settingsHeader">
              <div>
                <h2>Maya Settings</h2>
                <p>Control Maya's personality and voice.</p>
              </div>

              <button
                type="button"
                className="closeButton"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <label className="settingsField">
              <span>Name</span>
              <input
                value={settings.name}
                onChange={(event) =>
                  updateSetting("name", event.target.value)
                }
                maxLength={40}
              />
            </label>

            <label className="settingsField">
              <span>Personality</span>
              <textarea
                value={settings.personality}
                onChange={(event) =>
                  updateSetting("personality", event.target.value)
                }
                rows={4}
              />
            </label>

            <label className="settingsToggle">
              <span>
                <strong>Voice output</strong>
                <small>Allow Maya to speak responses.</small>
              </span>

              <input
                type="checkbox"
                checked={Boolean(settings.voiceEnabled)}
                onChange={(event) =>
                  updateSetting("voiceEnabled", event.target.checked)
                }
              />
            </label>

            <label className="settingsToggle">
              <span>
                <strong>Auto speak</strong>
                <small>Automatically speak new AI replies.</small>
              </span>

              <input
                type="checkbox"
                checked={Boolean(settings.autoSpeak)}
                onChange={(event) =>
                  updateSetting("autoSpeak", event.target.checked)
                }
              />
            </label>

            <div className="memoryTools">
              <button type="button" onClick={exportMemory}>
                Export Memory
              </button>

              <label className="fileButton">
                Import Memory
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={importMemory}
                  hidden
                />
              </label>

              <button
                type="button"
                className="dangerButton"
                onClick={clearEverything}
              >
                Clear Everything
              </button>
            </div>
          </section>
        )}

        <section className="chatArea">
          <div className="chatMessages">
            {messages.map((message) => (
              <div
                key={message.id || `${message.role}-${message.createdAt}`}
                className={`messageRow ${
                  message.role === "user" ? "userRow" : "mayaRow"
                }`}
              >
                {message.role !== "user" && (
                  <div className="messageAvatar">✦</div>
                )}

                <div
                  className={`messageBubble ${
                    message.role === "user"
                      ? "userBubble"
                      : "mayaBubble"
                  } ${message.isError ? "errorBubble" : ""}`}
                >
                  {message.image?.data && (
                    <img
                      src={message.image.data}
                      alt="User attachment"
                      className="messageImage"
                    />
                  )}

                  {message.content && (
                    <div className="messageText">
                      {message.content}
                    </div>
                  )}

                  <div className="messageTime">
                    {new Date(
                      message.createdAt || Date.now()
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="messageRow mayaRow">
                <div className="messageAvatar">✦</div>

                <div className="messageBubble mayaBubble typingBubble">
                  <span className="typingDot" />
                  <span className="typingDot" />
                  <span className="typingDot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        {image && (
          <div className="attachmentPreview">
            <img src={image.data} alt="Selected attachment" />

            <div className="attachmentInfo">
              <strong>{image.name}</strong>
              <span>Image ready</span>
            </div>

            <button
              type="button"
              onClick={removeImage}
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <footer className="composerArea">
          <div className="composer">
            <button
              type="button"
              className="composerButton"
              onClick={() => fileRef.current?.click()}
              disabled={isLoading}
              aria-label="Attach image"
              title="Attach image"
            >
              ＋
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => handleTyping(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${settings.name}...`}
              rows={1}
              disabled={isLoading}
            />

            <button
              type="button"
              className={`composerButton voiceButton ${
                isListening ? "active" : ""
              }`}
              onClick={toggleVoiceInput}
              disabled={isLoading}
              aria-label="Voice input"
              title="Voice input"
            >
              {isListening ? "🔴" : "🎤"}
            </button>

            {isSpeaking && (
              <button
                type="button"
                className="composerButton"
                onClick={stopSpeaking}
                aria-label="Stop speaking"
                title="Stop speaking"
              >
                🔇
              </button>
            )}

            <button
              type="button"
              className="sendButton"
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && !image)}
              aria-label="Send message"
              title="Send message"
            >
              ↑
            </button>
          </div>

          <div className="composerHint">
            <span>
              {isLoading
                ? `${settings.name} is thinking...`
                : "Enter to send · Shift + Enter for new line"}
            </span>

            <span>
              {memory.length} memory {memory.length === 1 ? "item" : "items"}
            </span>
          </div>
        </footer>
      </section>
    </main>
  );
}
