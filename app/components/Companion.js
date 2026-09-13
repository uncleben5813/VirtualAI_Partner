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

const defaultSettings = {
  name: "Maya",
  language: "BM + Manglish",
  autoSpeak: false,
  voiceRate: 1,
  personality: "warm, caring, playful, intelligent",
};

function MayaAvatar({ mood, loading, speaking, reacting }) {
  const avatarMood = loading ? "thinking" : mood;

  return (
    <div
      className={`mayaAvatarWrap ${
        reacting ? "mayaAvatarReacting" : ""
      } ${speaking ? "mayaAvatarSpeaking" : ""}`}
    >
      <div className={`mayaAvatar mood-${avatarMood}`}>
        <div className="mayaHijabBack" />
        <div className="mayaShoulders" />

        <div className="mayaHijab">
          <div className="mayaHijabInner" />
        </div>

        <div className="mayaNeck" />

        <div className="mayaFace">
          <div className="mayaBrows mayaBrowsLeft" />
          <div className="mayaBrows mayaBrowsRight" />

          <div className="mayaEye mayaEyeLeft">
            <span />
          </div>

          <div className="mayaEye mayaEyeRight">
            <span />
          </div>

          <div className="mayaNose" />

          <div className="mayaBlush mayaBlushLeft" />
          <div className="mayaBlush mayaBlushRight" />

          <div className="mayaMouth">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Companion() {
  const [messages, setMessages] = useState([]);
  const [mood, setMood] = useState("calm");
  const [memory, setMemory] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [reacting, setReacting] = useState(false);

  const [attachment, setAttachment] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const chatRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);
  const reactionTimerRef = useRef(null);

  const currentMood = useMemo(
    () => moods[mood] || moods.calm,
    [mood]
  );

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE.messages);
      const savedMood = localStorage.getItem(STORAGE.mood);
      const savedMemory = localStorage.getItem(STORAGE.memory);
      const savedSettings = localStorage.getItem(STORAGE.settings);

      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }

      if (savedMood && moods[savedMood]) {
        setMood(savedMood);
      }

      if (savedMemory) {
        const parsed = JSON.parse(savedMemory);
        if (Array.isArray(parsed)) {
          setMemory(parsed);
        }
      }

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === "object") {
          setSettings((prev) => ({
            ...prev,
            ...parsed,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to restore Maya data:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE.messages,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.mood, mood);
    } catch (error) {
      console.error("Failed to save mood:", error);
    }
  }, [mood]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE.memory,
        JSON.stringify(memory)
      );
    } catch (error) {
      console.error("Failed to save memory:", error);
    }
  }, [memory]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE.settings,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  useEffect(() => {
    const el = chatRef.current;

    if (!el) {
      return;
    }

    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) {
        clearTimeout(reactionTimerRef.current);
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors.
        }
      }

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function triggerReaction(duration = 900) {
    setReacting(true);

    if (reactionTimerRef.current) {
      clearTimeout(reactionTimerRef.current);
    }

    reactionTimerRef.current = setTimeout(() => {
      setReacting(false);
    }, duration);
  }

  function handleInputChange(event) {
    const value = event.target.value;
    setInput(value);

    if (value.trim()) {
      triggerReaction(650);
    }
  }

  function handleMoodChange(nextMood) {
    if (!moods[nextMood]) {
      return;
    }

    setMood(nextMood);
    triggerReaction(700);
  }

  function startListening() {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input tak disokong oleh browser ini. Cuba Chrome atau Safari versi terbaru."
      );
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore.
      }

      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "ms-MY";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      triggerReaction(1200);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);

      if (transcript.trim()) {
        triggerReaction(650);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error("Unable to start speech recognition:", error);
      setListening(false);
    }
  }

  function speakText(text) {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis ||
      !text
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "ms-MY";
    utterance.rate = Number(settings.voiceRate) || 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setSpeaking(true);
      triggerReaction(1200);
    };

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      alert("Saiz gambar maksimum ialah 6MB.");
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Sila pilih fail gambar.");
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

      triggerReaction(800);
    };

    reader.onerror = () => {
      alert("Gagal membaca gambar.");
    };

    reader.readAsDataURL(file);
  }

  function removeAttachment() {
    setAttachment(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function sendMessage() {
    const trimmed = input.trim();

    if ((!trimmed && !attachment) || loading) {
      return;
    }

    const userMessage = {
      role: "user",
      content: trimmed || "Tolong tengok gambar ini.",
      timestamp: Date.now(),
    };

    if (attachment) {
      userMessage.image = attachment.data;
      userMessage.imageName = attachment.name;
      userMessage.imageType = attachment.type;
    }

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setAttachment(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    setLoading(true);
    triggerReaction(1800);

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

      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error || "Maya gagal memberikan respons."
        );
      }

      const assistantText =
        data.text || "Maaf, Maya tak dapat jawab sekarang.";

      const assistantMessage = {
        role: "assistant",
        content: assistantText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.mood && moods[data.mood]) {
        setMood(data.mood);
      }

      triggerReaction(1100);

      if (settings.autoSpeak) {
        speakText(assistantText);
      }
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage = {
        role: "assistant",
        content:
          error?.message ||
          "Maaf, Maya mengalami masalah untuk seketika. Cuba lagi.",
        timestamp: Date.now(),
        error: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
      triggerReaction(1200);
    } finally {
      setLoading(false);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    if (
      !window.confirm(
        "Padam semua conversation Maya dalam device ini?"
      )
    ) {
      return;
    }

    setMessages([]);
    setMood("calm");
    setMemory([]);

    try {
      localStorage.removeItem(STORAGE.messages);
      localStorage.removeItem(STORAGE.memory);
      localStorage.setItem(STORAGE.mood, "calm");
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }

    triggerReaction(800);
  }

  function newChat() {
    setMessages([]);
    setInput("");
    setAttachment(null);
    setMood("calm");

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    triggerReaction(700);
  }

  function exportMemory() {
    const payload = {
      messages,
      mood,
      memory,
      settings,
      exportedAt: new Date().toISOString(),
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
    anchor.download = "maya-memory-export.json";
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
        const parsed = JSON.parse(reader.result);

        if (Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
        }

        if (
          typeof parsed.mood === "string" &&
          moods[parsed.mood]
        ) {
          setMood(parsed.mood);
        }

        if (Array.isArray(parsed.memory)) {
          setMemory(parsed.memory);
        }

        if (
          parsed.settings &&
          typeof parsed.settings === "object"
        ) {
          setSettings((prev) => ({
            ...prev,
            ...parsed.settings,
          }));
        }

        triggerReaction(1000);
        alert("Memory Maya berjaya diimport.");
      } catch (error) {
        console.error("Import error:", error);
        alert("Fail memory tidak sah.");
      }
    };

    reader.onerror = () => {
      alert("Gagal membaca fail memory.");
    };

    reader.readAsText(file);

    event.target.value = "";
  }

  return (
    <main className="mayaApp">
      <header className="mayaTopbar">
        <div className="mayaBrand">
          <div className="mayaBrandIcon">M</div>

          <div>
            <div className="mayaBrandName">
              {settings.name || "Maya"}
            </div>

            <div className="mayaBrandStatus">
              <span className="onlineDot" />
              AI Companion
            </div>
          </div>
        </div>

        <div className="mayaTopActions">
          <button
            type="button"
            className="topActionButton"
            onClick={newChat}
            title="New chat"
          >
            +
          </button>

          <button
            type="button"
            className="topActionButton"
            onClick={() => setShowSettings((value) => !value)}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      <section className="mayaLiveSection">
        <div className="liveHeader">
          <div>
            <div className="liveTitle">
              <span className="liveDot" />
              LIVE AI
            </div>

            <div className="liveSubtitle">
              Maya is here
            </div>
          </div>

          <div className="liveStatus">
            {speaking
              ? "Speaking..."
              : listening
              ? "Listening..."
              : loading
              ? "Thinking..."
              : "Online"}
          </div>
        </div>

        <div className="mayaLiveContent">
          <MayaAvatar
            mood={mood}
            loading={loading}
            speaking={speaking}
            reacting={reacting}
          />

          <div className="mayaLiveInfo">
            <div className="mayaLiveName">
              {settings.name || "Maya"}
            </div>

            <div className="mayaLiveMood">
              {currentMood.emoji} {currentMood.label}
            </div>

            <div className="mayaLiveHint">
              {loading
                ? "Maya tengah fikir..."
                : listening
                ? "Maya sedang dengar..."
                : speaking
                ? "Maya sedang bercakap..."
                : reacting
                ? "Maya reacting..."
                : "Ready to chat"}
            </div>
          </div>
        </div>

        <div className="moodRow">
          {Object.entries(moods).map(([id, item]) => (
            <button
              type="button"
              key={id}
              className={`moodButton ${
                mood === id ? "active" : ""
              }`}
              onClick={() => handleMoodChange(id)}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {showSettings && (
        <section className="settingsPanel">
          <div className="settingsTitle">
            Maya Settings
          </div>

          <label className="settingsField">
            <span>Name</span>

            <input
              value={settings.name}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Maya"
            />
          </label>

          <label className="settingsField">
            <span>Language</span>

            <select
              value={settings.language}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  language: event.target.value,
                }))
              }
            >
              <option value="BM + Manglish">
                BM + Manglish
              </option>
              <option value="Bahasa Melayu">
                Bahasa Melayu
              </option>
              <option value="English">
                English
              </option>
            </select>
          </label>

          <label className="settingsCheck">
            <input
              type="checkbox"
              checked={settings.autoSpeak}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  autoSpeak: event.target.checked,
                }))
              }
            />

            <span>Auto voice reply</span>
          </label>

          <label className="settingsField">
            <span>
              Voice speed:{" "}
              {Number(settings.voiceRate).toFixed(1)}
            </span>

            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.1"
              value={settings.voiceRate}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  voiceRate: Number(event.target.value),
                }))
              }
            />
          </label>

          <div className="settingsActions">
            <button
              type="button"
              onClick={exportMemory}
            >
              Export Memory
            </button>

            <label className="fileButton">
              Import Memory
              <input
                type="file"
                accept="application/json"
                onChange={importMemory}
                hidden
              />
            </label>

            <button
              type="button"
              className="dangerButton"
              onClick={clearChat}
            >
              Clear Memory
            </button>
          </div>
        </section>
      )}

      <section
        className="mayaChat"
        ref={chatRef}
      >
        {messages.length === 0 && (
          <div className="emptyChat">
            <div className="emptyAvatar">M</div>

            <h2>Hi, saya Maya 👋</h2>

            <p>
              Saya ready untuk chat dengan awak.
              Taip mesej, gunakan voice atau hantar gambar.
            </p>
          </div>
        )}

        {messages.map((message, index) => {
          const isUser = message.role === "user";

          return (
            <div
              key={`${message.timestamp || index}-${index}`}
              className={`messageRow ${
                isUser ? "userRow" : "mayaRow"
              }`}
            >
              {!isUser && (
                <div className="messageAvatar">
                  M
                </div>
              )}

              <div
                className={`messageBubble ${
                  isUser
                    ? "userBubble"
                    : "mayaBubble"
                } ${
                  message.error ? "errorBubble" : ""
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

                <div className="messageTime">
                  {new Date(
                    message.timestamp || Date.now()
                  ).toLocaleTimeString("ms-MY", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="messageRow mayaRow">
            <div className="messageAvatar">M</div>

            <div className="messageBubble mayaBubble typingBubble">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </section>

      {attachment && (
        <div className="attachmentBar">
          <div className="attachmentInfo">
            <img
              src={attachment.data}
              alt="Preview"
            />

            <div>
              <strong>{attachment.name}</strong>
              <small>Image ready</small>
            </div>
          </div>

          <button
            type="button"
            onClick={removeAttachment}
          >
            ×
          </button>
        </div>
      )}

      <div className="mayaNotice">
        Maya ialah AI companion. Jangan kongsi maklumat
        sensitif seperti password atau maklumat kewangan.
      </div>

      <form
        className="mayaComposer"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          hidden
        />

        <button
          type="button"
          className="composerButton"
          onClick={() => fileRef.current?.click()}
          title="Attach image"
        >
          ＋
        </button>

        <button
          type="button"
          className={`composerButton ${
            listening ? "activeVoice" : ""
          }`}
          onClick={startListening}
          title="Voice input"
        >
          {listening ? "🔴" : "🎙️"}
        </button>

        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleComposerKeyDown}
          placeholder={
            listening
              ? "Maya sedang dengar..."
              : "Message Maya..."
          }
          rows={1}
          disabled={loading}
        />

        <button
          type="submit"
          className="sendButton"
          disabled={
            loading ||
            (!input.trim() && !attachment)
          }
          title="Send"
        >
          ↑
        </button>
      </form>
    </main>
  );
}
