"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE = {
  messages: "maya_messages_v3",
  mood: "maya_mood_v3",
  memory: "maya_memory_v3",
  settings: "maya_settings_v3",
};

const MOODS = {
  happy: {
    label: "Happy",
    emoji: "😊",
  },
  caring: {
    label: "Caring",
    emoji: "❤️",
  },
  playful: {
    label: "Playful",
    emoji: "✨",
  },
  calm: {
    label: "Calm",
    emoji: "🌙",
  },
  upset: {
    label: "Upset",
    emoji: "🥺",
  },
};

const DEFAULT_SETTINGS = {
  name: "Maya",
  language: "BM + Manglish",
  personality: "warm, caring, playful, natural and intelligent",
  autoSpeak: false,
  voiceEnabled: true,
  voiceRate: 1,
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeRead(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors.
  }
}

function normalizeMood(value) {
  if (!value) {
    return "calm";
  }

  const mood = String(value).toLowerCase();

  if (MOODS[mood]) {
    return mood;
  }

  if (/happy|excited|joy|cheerful|positive|senang|gembira/.test(mood)) {
    return "happy";
  }

  if (/care|caring|love|warm|support|sayang|prihatin/.test(mood)) {
    return "caring";
  }

  if (/playful|fun|tease|ceria|gurau|seronok/.test(mood)) {
    return "playful";
  }

  if (/sad|upset|hurt|down|sedih|kecewa/.test(mood)) {
    return "upset";
  }

  return "calm";
}

function detectMoodFromText(text) {
  const value = String(text || "").toLowerCase();

  if (
    /haha|lol|😂|🤣|best|seronok|gembira|happy|nice|yay|terbaik/.test(
      value
    )
  ) {
    return "happy";
  }

  if (
    /sayang|thanks|thank you|terima kasih|jaga|risau|care|prihatin/.test(
      value
    )
  ) {
    return "caring";
  }

  if (
    /haha|hehe|gurau|lol|joke|lawak|fun|main-main|😂|🤣/.test(value)
  ) {
    return "playful";
  }

  if (
    /sedih|kecewa|marah|geram|stress|upset|sorry|maaf|tak okay|tak ok/.test(
      value
    )
  ) {
    return "upset";
  }

  return "calm";
}

function formatTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  try {
    return new Date(timestamp).toLocaleTimeString("ms-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Companion() {
  const [messages, setMessages] = useState([]);
  const [mood, setMood] = useState("calm");
  const [memory, setMemory] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null);

  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const [reaction, setReaction] = useState("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const reactionTimerRef = useRef(null);

  useEffect(() => {
    const storedMessages = safeRead(STORAGE.messages, null);
    const storedMood = safeRead(STORAGE.mood, "calm");
    const storedMemory = safeRead(STORAGE.memory, []);
    const storedSettings = safeRead(
      STORAGE.settings,
      DEFAULT_SETTINGS
    );

    if (Array.isArray(storedMessages) && storedMessages.length > 0) {
      setMessages(storedMessages);
    } else {
      setMessages([
        {
          id: "maya-welcome",
          role: "assistant",
          content: "Hi, I'm Maya. 😊 Nak sembang apa hari ni?",
          createdAt: Date.now(),
        },
      ]);
    }

    setMood(normalizeMood(storedMood));

    if (Array.isArray(storedMemory)) {
      setMemory(storedMemory);
    }

    setSettings({
      ...DEFAULT_SETTINGS,
      ...(storedSettings || {}),
    });

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    safeWrite(STORAGE.messages, messages);
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    safeWrite(STORAGE.mood, mood);
  }, [mood, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    safeWrite(STORAGE.memory, memory);
  }, [memory, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    safeWrite(STORAGE.settings, settings);
  }, [settings, hydrated]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }

      recognitionRef.current?.stop();

      if (reactionTimerRef.current) {
        window.clearTimeout(reactionTimerRef.current);
      }
    };
  }, []);

  function temporaryReaction(nextReaction, duration = 1800) {
    setReaction(nextReaction);

    if (reactionTimerRef.current) {
      window.clearTimeout(reactionTimerRef.current);
    }

    reactionTimerRef.current = window.setTimeout(() => {
      setReaction("idle");
    }, duration);
  }

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTyping(event) {
    const value = event.target.value;

    setInput(value);

    if (value.trim()) {
      setReaction("typing");
    } else if (!loading && !listening && !speaking) {
      setReaction("idle");
    }
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      window.alert("Please select an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      window.alert("Image terlalu besar. Maximum 8MB.");
      return;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(file);
      });

      setAttachment({
        name: file.name,
        type: file.type,
        data: dataUrl,
      });

      temporaryReaction("curious", 1500);
    } catch {
      window.alert("Unable to read image.");
    }

    event.target.value = "";
  }

  function removeAttachment() {
    setAttachment(null);
  }

  function speak(text) {
    if (
      !settings.voiceEnabled ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const cleanText = String(text || "").trim();

    if (!cleanText) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = window.speechSynthesis.getVoices();

    const preferredVoice =
      voices.find((voice) => voice.lang?.toLowerCase() === "ms-my") ||
      voices.find((voice) => voice.lang?.toLowerCase() === "en-my") ||
      voices.find((voice) => voice.lang?.toLowerCase() === "en-sg") ||
      voices.find((voice) => voice.lang?.toLowerCase() === "en-us") ||
      voices.find((voice) => voice.lang?.toLowerCase() === "en-gb");

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.lang = preferredVoice?.lang || "ms-MY";
    utterance.rate = Number(settings.voiceRate) || 1;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    utterance.onstart = () => {
      setSpeaking(true);
      setReaction("speaking");
    };

    utterance.onend = () => {
      setSpeaking(false);

      if (!loading && !listening) {
        setReaction("idle");
      }
    };

    utterance.onerror = () => {
      setSpeaking(false);

      if (!loading && !listening) {
        setReaction("idle");
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }

    setSpeaking(false);

    if (!loading && !listening) {
      setReaction("idle");
    }
  }

  function toggleListening() {
    if (typeof window === "undefined") {
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);

      if (!loading && !speaking) {
        setReaction("idle");
      }

      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      window.alert(
        "Voice input tidak disokong oleh browser ini. Cuba Chrome atau Safari yang menyokong Speech Recognition."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "ms-MY";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setReaction("listening");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        transcript += event.results[index][0].transcript;
      }

      setInput(transcript);
    };

    recognition.onerror = () => {
      setListening(false);

      if (!loading && !speaking) {
        setReaction("idle");
      }
    };

    recognition.onend = () => {
      setListening(false);

      if (!loading && !speaking) {
        setReaction("idle");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      setReaction("idle");
    }
  }

  function addMemory(value) {
    const cleanValue = String(value || "").trim();

    if (!cleanValue) {
      return;
    }

    setMemory((current) => {
      const next = [
        ...current.filter(
          (item) =>
            String(item).toLowerCase() !== cleanValue.toLowerCase()
        ),
        cleanValue,
      ];

      return next.slice(-50);
    });
  }

  async function sendMessage() {
    const text = input.trim();

    if ((!text && !attachment) || loading) {
      return;
    }

    const userMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      image: attachment?.data || null,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setAttachment(null);
    setLoading(true);
    setReaction("thinking");

    if (text) {
      const detectedMood = detectMoodFromText(text);

      if (detectedMood !== "calm") {
        setMood(detectedMood);
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
            image: message.image || null,
          })),
          mood,
          memory,
          settings,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error || "Maya could not respond right now."
        );
      }

      const assistantText =
        String(data.text || "").trim() ||
        "Sorry, Maya tak dapat jawab sekarang. Cuba lagi.";

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        createdAt: Date.now(),
      };

      setMessages((current) => [...current, assistantMessage]);

      if (data.mood) {
        setMood(normalizeMood(data.mood));
      } else {
        setMood(detectMoodFromText(assistantText));
      }

      if (Array.isArray(data.memory)) {
        setMemory(data.memory.slice(-50));
      }

      setReaction("reply");

      if (settings.autoSpeak) {
        window.setTimeout(() => {
          speak(assistantText);
        }, 150);
      } else {
        window.setTimeout(() => {
          setReaction("idle");
        }, 1400);
      }
    } catch (error) {
      const errorMessage = {
        id: createId(),
        role: "assistant",
        content:
          error?.message ||
          "Maya mengalami masalah untuk connect dengan AI.",
        createdAt: Date.now(),
        error: true,
      };

      setMessages((current) => [...current, errorMessage]);
      setReaction("upset");

      window.setTimeout(() => {
        setReaction("idle");
      }, 1800);
    } finally {
      setLoading(false);

      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function startNewChat() {
    if (loading) {
      return;
    }

    const confirmed = window.confirm(
      "Start new chat? Conversation semasa akan dibersihkan."
    );

    if (!confirmed) {
      return;
    }

    setMessages([
      {
        id: createId(),
        role: "assistant",
        content: "Okay, kita start fresh. 😊",
        createdAt: Date.now(),
      },
    ]);

    setMood("happy");
    setReaction("happy");
    setInput("");
    setAttachment(null);

    window.setTimeout(() => {
      setReaction("idle");
    }, 1400);
  }

  function clearEverything() {
    const confirmed = window.confirm(
      "Clear semua conversation, memory dan mood?"
    );

    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(STORAGE.messages);
    window.localStorage.removeItem(STORAGE.mood);
    window.localStorage.removeItem(STORAGE.memory);

    setMessages([
      {
        id: createId(),
        role: "assistant",
        content: "Semua dah clear. Hi again. 😊",
        createdAt: Date.now(),
      },
    ]);

    setMood("happy");
    setMemory([]);
    setReaction("happy");

    window.setTimeout(() => {
      setReaction("idle");
    }, 1400);
  }

  function exportMemory() {
    const payload = {
      exportedAt: new Date().toISOString(),
      memory,
      mood,
      settings,
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "maya-memory.json";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function importMemory(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);

        if (Array.isArray(payload.memory)) {
          setMemory(payload.memory.slice(-50));
        }

        if (payload.mood) {
          setMood(normalizeMood(payload.mood));
        }

        if (payload.settings) {
          setSettings((current) => ({
            ...current,
            ...payload.settings,
          }));
        }

        temporaryReaction("happy", 1600);
        window.alert("Maya memory imported.");
      } catch {
        window.alert("Invalid Maya memory file.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  const activeMood = MOODS[mood] || MOODS.calm;

  const visualState = useMemo(() => {
    if (speaking) {
      return "speaking";
    }

    if (listening) {
      return "listening";
    }

    if (loading) {
      return "thinking";
    }

    if (reaction === "typing") {
      return "typing";
    }

    if (reaction === "curious") {
      return "curious";
    }

    if (reaction === "reply") {
      return "reply";
    }

    if (reaction === "happy") {
      return "happy";
    }

    if (reaction === "upset") {
      return "upset";
    }

    if (reaction === "thinking") {
      return "thinking";
    }

    if (reaction === "listening") {
      return "listening";
    }

    if (reaction === "speaking") {
      return "speaking";
    }

    return mood;
  }, [mood, reaction, loading, listening, speaking]);

  const reactionText = useMemo(() => {
    if (speaking) {
      return "Maya sedang bercakap...";
    }

    if (listening) {
      return "Maya sedang dengar...";
    }

    if (loading) {
      return "Maya sedang fikir...";
    }

    if (reaction === "typing") {
      return "Maya perasan kau tengah menaip...";
    }

    if (reaction === "curious") {
      return "Maya tengah tengok...";
    }

    if (reaction === "reply") {
      return "Maya dah reply";
    }

    return `${activeMood.emoji} ${activeMood.label}`;
  }, [
    speaking,
    listening,
    loading,
    reaction,
    activeMood,
  ]);

  if (!hydrated) {
    return (
      <main className="companionApp">
        <div className="companionShell loadingShell">
          <div className="loadingScreen">
            <div className="loadingOrb" />
            <strong>Maya</strong>
            <span>Loading AI companion...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="companionApp">
      <div className="companionShell">
        <header className="topBar">
          <div className="brandBlock">
            <div className="brandAvatar">M</div>

            <div>
              <div className="brandName">
                {settings.name || "Maya"}
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
              onClick={() => setShowSettings((value) => !value)}
              aria-label="Settings"
              title="Settings"
            >
              ⚙️
            </button>

            <button
              type="button"
              className="newChatButton"
              onClick={startNewChat}
              disabled={loading}
            >
              + New Chat
            </button>
          </div>
        </header>

        <section
          className={`liveAiCard mood-${mood} state-${visualState}`}
        >
          <div className="liveAiHeader">
            <div>
              <div className="liveAiTitle">
                LIVE AI
                <span className="liveBadge">LIVE</span>
              </div>

              <div className="liveAiSubtitle">
                {reactionText}
              </div>
            </div>

            <div className="moodBadge">
              <span>{activeMood.emoji}</span>
              {activeMood.label}
            </div>
          </div>

          <div
            className="mayaVisual"
            aria-label={`Maya ${activeMood.label}`}
          >
            <div className="mayaGlow" />

            <div className="mayaHairBack" />

            <div className="mayaHead">
              <div className="mayaHairTop" />

              <div className="mayaEar mayaEarLeft" />
              <div className="mayaEar mayaEarRight" />

              <div className="mayaEyebrow mayaEyebrowLeft" />
              <div className="mayaEyebrow mayaEyebrowRight" />

              <div className="mayaEye mayaEyeLeft">
                <div className="mayaIris">
                  <div className="mayaPupil" />
                  <div className="mayaEyeLight" />
                </div>
              </div>

              <div className="mayaEye mayaEyeRight">
                <div className="mayaIris">
                  <div className="mayaPupil" />
                  <div className="mayaEyeLight" />
                </div>
              </div>

              <div className="mayaNose" />

              <div className="mayaCheek mayaCheekLeft" />
              <div className="mayaCheek mayaCheekRight" />

              <div className="mayaMouth">
                <span />
              </div>
            </div>

            <div className="mayaNeck" />
            <div className="mayaShoulders" />
          </div>

          <div className="liveAiState">
            <span className="stateDot" />
            {visualState === "thinking"
              ? "Thinking"
              : visualState === "listening"
                ? "Listening"
                : visualState === "speaking"
                  ? "Speaking"
                  : "Ready"}
          </div>
        </section>

        {showSettings && (
          <section className="settingsPanel">
            <div className="settingsHeader">
              <div>
                <h3>Maya Settings</h3>
                <p>Personalise cara Maya interact dengan kau.</p>
              </div>

              <button
                type="button"
                className="closeSettings"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <div className="settingsGrid">
              <label className="settingsField">
                <span>Maya name</span>

                <input
                  type="text"
                  value={settings.name}
                  onChange={(event) =>
                    updateSetting("name", event.target.value)
                  }
                />
              </label>

              <label className="settingsField">
                <span>Language</span>

                <select
                  value={settings.language}
                  onChange={(event) =>
                    updateSetting("language", event.target.value)
                  }
                >
                  <option value="BM + Manglish">BM + Manglish</option>
                  <option value="Bahasa Melayu">Bahasa Melayu</option>
                  <option value="English">English</option>
                </select>
              </label>

              <label className="settingsField settingsWide">
                <span>Personality</span>

                <textarea
                  value={settings.personality}
                  onChange={(event) =>
                    updateSetting(
                      "personality",
                      event.target.value
                    )
                  }
                  rows={3}
                />
              </label>

              <label className="settingsToggle">
                <input
                  type="checkbox"
                  checked={settings.voiceEnabled}
                  onChange={(event) =>
                    updateSetting(
                      "voiceEnabled",
                      event.target.checked
                    )
                  }
                />

                <span>
                  <strong>Voice output</strong>
                  <small>Allow Maya to speak</small>
                </span>
              </label>

              <label className="settingsToggle">
                <input
                  type="checkbox"
                  checked={settings.autoSpeak}
                  onChange={(event) =>
                    updateSetting(
                      "autoSpeak",
                      event.target.checked
                    )
                  }
                />

                <span>
                  <strong>Auto speak</strong>
                  <small>Speak after every AI reply</small>
                </span>
              </label>

              <label className="settingsField">
                <span>Voice speed</span>

                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={settings.voiceRate}
                  onChange={(event) =>
                    updateSetting(
                      "voiceRate",
                      Number(event.target.value)
                    )
                  }
                />
              </label>
            </div>

            <div className="settingsActions">
              <button
                type="button"
                onClick={exportMemory}
                className="secondaryButton"
              >
                Export Memory
              </button>

              <label className="secondaryButton fileButton">
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
                onClick={clearEverything}
                className="dangerButton"
              >
                Clear Everything
              </button>
            </div>
          </section>
        )}

        <section className="chatSection">
          <div className="chatHeader">
            <div>
              <strong>Conversation</strong>
              <span>{messages.length} messages</span>
            </div>
          </div>

          <div className="chatScroll">
            <div className="chatInner">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`messageRow ${
                    message.role === "user"
                      ? "messageUser"
                      : "messageMaya"
                  }`}
                >
                  {message.role !== "user" && (
                    <div className="messageAvatar">M</div>
                  )}

                  <div className="messageContent">
                    {message.image && (
                      <img
                        src={message.image}
                        alt="User attachment"
                        className="messageImage"
                      />
                    )}

                    {message.content && (
                      <div
                        className={`messageBubble ${
                          message.error ? "messageError" : ""
                        }`}
                      >
                        {message.content}
                      </div>
                    )}

                    <div className="messageMeta">
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="messageRow messageMaya">
                  <div className="messageAvatar">M</div>

                  <div className="messageContent">
                    <div className="typingBubble">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </section>

        {attachment && (
          <div className="attachmentPreview">
            <img
              src={attachment.data}
              alt={attachment.name}
            />

            <div className="attachmentInfo">
              <strong>{attachment.name}</strong>
              <span>Image ready</span>
            </div>

            <button
              type="button"
              onClick={removeAttachment}
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <section className="composer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImage}
            hidden
          />

          <button
            type="button"
            className="composerButton"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach image"
          >
            ＋
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Message Maya..."
            rows={1}
            disabled={loading}
          />

          <button
            type="button"
            className={`composerButton ${
              listening ? "activeComposerButton" : ""
            }`}
            onClick={toggleListening}
            disabled={loading}
            title="Voice input"
          >
            🎤
          </button>

          {speaking && (
            <button
              type="button"
              className="composerButton"
              onClick={stopSpeaking}
              title="Stop Maya voice"
            >
              ■
            </button>
          )}

          <button
            type="button"
            className="sendButton"
            onClick={sendMessage}
            disabled={loading || (!input.trim() && !attachment)}
          >
            {loading ? "..." : "➤"}
          </button>
        </section>
      </div>
    </main>
  );
}
