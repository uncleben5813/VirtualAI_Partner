"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* =========================================================
   MAYA — AI COMPANION
   Frontend controller
   ========================================================= */

const MOODS = {
  happy: {
    label: "Happy",
    emoji: "😊",
    avatar: "happy",
  },

  caring: {
    label: "Caring",
    emoji: "❤️",
    avatar: "caring",
  },

  playful: {
    label: "Playful",
    emoji: "✨",
    avatar: "playful",
  },

  calm: {
    label: "Calm",
    emoji: "🌙",
    avatar: "calm",
  },

  upset: {
    label: "Upset",
    emoji: "🥺",
    avatar: "upset",
  },

  surprised: {
    label: "Surprised",
    emoji: "😮",
    avatar: "surprised",
  },

  angry: {
    label: "Angry",
    emoji: "😤",
    avatar: "angry",
  },
};

const STORAGE = {
  messages: "maya_messages_v3",
  mood: "maya_mood_v3",
  memory: "maya_memory_v3",
  settings: "maya_settings_v3",
};

const DEFAULT_SETTINGS = {
  name: "Maya",
  language: "BM + Manglish",
  autoSpeak: false,
  voiceRate: 1,
  personality:
    "warm, caring, playful, intelligent, natural and emotionally aware",
};

/* =========================================================
   Helpers
   ========================================================= */

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getAvatarFile(state) {
  const files = {
    neutral: "/maya/neutral.jpg",
    happy: "/maya/happy.jpg",
    caring: "/maya/caring.jpg",
    playful: "/maya/playful.jpg",
    calm: "/maya/calm.jpg",
    upset: "/maya/upset.jpg",
    thinking: "/maya/thinking.jpg",
    surprised: "/maya/surprised.jpg",
    angry: "/maya/angry.jpg",
    blink: "/maya/blink.jpg",
    talking: "/maya/talking.jpg",
  };

  return files[state] || files.neutral;
}

/* =========================================================
   Realistic Maya Avatar
   ========================================================= */

function MayaAvatar({
  mood,
  loading,
  speaking,
  listening,
  reacting,
  blinking,
}) {
  let state = MOODS[mood]?.avatar || "neutral";

  if (loading) {
    state = "thinking";
  }

  if (speaking) {
    state = "talking";
  }

  if (blinking && !loading && !speaking) {
    state = "blink";
  }

  const image = getAvatarFile(state);

  return (
    <div
      className={[
        "mayaAvatarWrap",
        reacting ? "mayaAvatarReacting" : "",
        speaking ? "mayaAvatarSpeaking" : "",
        listening ? "mayaAvatarListening" : "",
        loading ? "mayaAvatarThinking" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mayaAvatarGlow" />

      <img
        className={`mayaAvatarImage mayaAvatarState-${state}`}
        src={image}
        alt="Maya AI Companion"
        draggable="false"
      />

      <div className="mayaAvatarStatus">
        {loading
          ? "Thinking..."
          : listening
          ? "Listening..."
          : speaking
          ? "Speaking..."
          : ""}
      </div>
    </div>
  );
}

/* =========================================================
   Main Component
   ========================================================= */

export default function Companion() {
  const [messages, setMessages] = useState([]);
  const [mood, setMood] = useState("calm");
  const [memory, setMemory] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [reacting, setReacting] = useState(false);

  const [attachment, setAttachment] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const chatRef = useRef(null);
  const fileRef = useRef(null);
  const importRef = useRef(null);

  const recognitionRef = useRef(null);
  const reactionTimerRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const blinkOffTimerRef = useRef(null);

  const currentMood = useMemo(() => {
    return MOODS[mood] || MOODS.calm;
  }, [mood]);

  /* =======================================================
     Restore saved data
     ======================================================= */

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(
        STORAGE.messages
      );

      const savedMood = localStorage.getItem(STORAGE.mood);

      const savedMemory = localStorage.getItem(
        STORAGE.memory
      );

      const savedSettings = localStorage.getItem(
        STORAGE.settings
      );

      if (savedMessages) {
        const parsed = safeJsonParse(savedMessages, []);

        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }

      if (savedMood && MOODS[savedMood]) {
        setMood(savedMood);
      }

      if (savedMemory) {
        const parsed = safeJsonParse(savedMemory, []);

        if (Array.isArray(parsed)) {
          setMemory(parsed);
        }
      }

      if (savedSettings) {
        const parsed = safeJsonParse(savedSettings, {});

        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          setSettings((previous) => ({
            ...previous,
            ...parsed,
          }));
        }
      }
    } catch (error) {
      console.error(
        "Maya restore error:",
        error
      );
    }
  }, []);

  /* =======================================================
     Persistent messages
     ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE.messages,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error(
        "Maya message save error:",
        error
      );
    }
  }, [messages]);

  /* =======================================================
     Persistent mood
     ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE.mood,
        mood
      );
    } catch (error) {
      console.error(
        "Maya mood save error:",
        error
      );
    }
  }, [mood]);

  /* =======================================================
     Persistent memory
     ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE.memory,
        JSON.stringify(memory)
      );
    } catch (error) {
      console.error(
        "Maya memory save error:",
        error
      );
    }
  }, [memory]);

  /* =======================================================
     Persistent settings
     ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE.settings,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error(
        "Maya settings save error:",
        error
      );
    }
  }, [settings]);

  /* =======================================================
     Automatic natural blinking
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const scheduleBlink = () => {
      const delay =
        2500 +
        Math.floor(
          Math.random() * 3500
        );

      blinkTimerRef.current =
        setTimeout(() => {
          if (cancelled) {
            return;
          }

          if (!loading && !speaking && !listening) {
            setBlinking(true);

            blinkOffTimerRef.current =
              setTimeout(() => {
                setBlinking(false);
              }, 160);
          }

          scheduleBlink();
        }, delay);
    };

    scheduleBlink();

    return () => {
      cancelled = true;

      if (blinkTimerRef.current) {
        clearTimeout(
          blinkTimerRef.current
        );
      }

      if (blinkOffTimerRef.current) {
        clearTimeout(
          blinkOffTimerRef.current
        );
      }
    };
  }, [loading, speaking, listening]);

  /* =======================================================
     Auto scroll chat only
     ======================================================= */

  useEffect(() => {
    const element = chatRef.current;

    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, loading]);

  /* =======================================================
     Cleanup
     ======================================================= */

  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) {
        clearTimeout(
          reactionTimerRef.current
        );
      }

      if (blinkTimerRef.current) {
        clearTimeout(
          blinkTimerRef.current
        );
      }

      if (blinkOffTimerRef.current) {
        clearTimeout(
          blinkOffTimerRef.current
        );
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore browser cleanup errors.
        }
      }

      if (
        typeof window !== "undefined" &&
        window.speechSynthesis
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* =======================================================
     Reaction animation
     ======================================================= */

  function triggerReaction(
    duration = 900
  ) {
    setReacting(true);

    if (reactionTimerRef.current) {
      clearTimeout(
        reactionTimerRef.current
      );
    }

    reactionTimerRef.current =
      setTimeout(() => {
        setReacting(false);
      }, duration);
  }

  /* =======================================================
     Input
     ======================================================= */

  function handleInputChange(event) {
    const value =
      event.target.value;

    setInput(value);

    if (value.trim()) {
      triggerReaction(500);
    }
  }

  /* =======================================================
     Mood
     ======================================================= */

  function handleMoodChange(nextMood) {
    if (!MOODS[nextMood]) {
      return;
    }

    setMood(nextMood);
    triggerReaction(750);
  }

  /* =======================================================
     Voice recognition
     ======================================================= */

  function startListening() {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input tak disokong oleh browser ini. Cuba Safari atau Chrome versi terbaru."
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

    const recognition =
      new SpeechRecognition();

    const selectedLanguage =
      settings.language === "English"
        ? "en-US"
        : "ms-MY";

    recognition.lang =
      selectedLanguage;

    recognition.interimResults =
      true;

    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      triggerReaction(1400);
    };

    recognition.onresult = (
      event
    ) => {
      let transcript = "";

      for (
        let index =
          event.resultIndex;
        index <
        event.results.length;
        index += 1
      ) {
        transcript +=
          event.results[index][0]
            .transcript;
      }

      setInput(transcript);

      if (transcript.trim()) {
        triggerReaction(700);
      }
    };

    recognition.onerror = (
      event
    ) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error(
        "Unable to start speech recognition:",
        error
      );

      setListening(false);
    }
  }

  /* =======================================================
     Voice output
     ======================================================= */

  function speakText(text) {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis ||
      !text
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    utterance.lang =
      settings.language === "English"
        ? "en-US"
        : "ms-MY";

    utterance.rate =
      Number(settings.voiceRate) ||
      1;

    utterance.pitch = 1;

    utterance.onstart = () => {
      setSpeaking(true);
      triggerReaction(1500);
    };

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(
      utterance
    );
  }

  /* =======================================================
     Image attachment
     ======================================================= */

  function handleFileChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      file.size >
      6 * 1024 * 1024
    ) {
      alert(
        "Saiz gambar maksimum ialah 6MB."
      );

      event.target.value = "";

      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      alert(
        "Sila pilih fail gambar."
      );

      event.target.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        data: reader.result,
      });

      triggerReaction(850);
    };

    reader.onerror = () => {
      alert(
        "Gagal membaca gambar."
      );
    };

    reader.readAsDataURL(file);
  }

  function removeAttachment() {
    setAttachment(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  /* =======================================================
     Send message
     ======================================================= */

  async function sendMessage() {
    const trimmed =
      input.trim();

    if (
      (!trimmed && !attachment) ||
      loading
    ) {
      return;
    }

    const userMessage = {
      role: "user",
      content:
        trimmed ||
        "Tolong tengok gambar ini.",
      timestamp: Date.now(),
    };

    if (attachment) {
      userMessage.image =
        attachment.data;

      userMessage.imageName =
        attachment.name;

      userMessage.imageType =
        attachment.type;
    }

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);

    setInput("");

    setAttachment(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    setLoading(true);

    setMood("calm");

    triggerReaction(1800);

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              messages:
                nextMessages.slice(
                  -40
                ),

              mood,

              memory,

              settings: {
                name:
                  settings.name,

                language:
                  settings.language,

                personality:
                  settings.personality,
              },
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            "Maya gagal memberikan respons."
        );
      }

      const assistantText =
        data.text ||
        "Maaf, Maya tak dapat jawab sekarang.";

      const assistantMessage = {
        role: "assistant",
        content:
          assistantText,
        timestamp:
          Date.now(),
      };

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );

      /* ---------------------------
         Mood from AI
         --------------------------- */

      if (
        data.mood &&
        MOODS[data.mood]
      ) {
        setMood(data.mood);
      }

      /* ---------------------------
         Memory from AI
         --------------------------- */

      if (
        Array.isArray(
          data.memories
        ) &&
        data.memories.length
      ) {
        setMemory(
          (previous) => {
            const combined = [
              ...previous,
              ...data.memories,
            ];

            const unique =
              Array.from(
                new Set(
                  combined
                    .map((item) =>
                      String(
                        item
                      ).trim()
                    )
                    .filter(Boolean)
                )
              );

            return unique.slice(
              -100
            );
          }
        );
      }

      triggerReaction(1100);

      if (settings.autoSpeak) {
        speakText(
          assistantText
        );
      }
    } catch (error) {
      console.error(
        "Maya chat error:",
        error
      );

      const errorMessage = {
        role: "assistant",

        content:
          error?.message ||
          "Maaf, Maya mengalami masalah untuk seketika. Cuba lagi.",

        timestamp:
          Date.now(),

        error: true,
      };

      setMessages(
        (previous) => [
          ...previous,
          errorMessage,
        ]
      );

      setMood("upset");

      triggerReaction(1200);
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     Enter to send
     ======================================================= */

  function handleComposerKeyDown(
    event
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  /* =======================================================
     New chat
     ======================================================= */

  function newChat() {
    if (loading) {
      return;
    }

    setMessages([]);

    setInput("");

    setAttachment(null);

    setMood("calm");

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    triggerReaction(700);
  }

  /* =======================================================
     Clear everything
     ======================================================= */

  function clearChat() {
    const confirmed =
      window.confirm(
        "Padam semua conversation dan memory Maya dalam device ini?"
      );

    if (!confirmed) {
      return;
    }

    setMessages([]);

    setMood("calm");

    setMemory([]);

    setInput("");

    setAttachment(null);

    try {
      localStorage.removeItem(
        STORAGE.messages
      );

      localStorage.removeItem(
        STORAGE.memory
      );

      localStorage.setItem(
        STORAGE.mood,
        "calm"
      );
    } catch (error) {
      console.error(
        "Clear Maya data error:",
        error
      );
    }

    triggerReaction(800);
  }

  /* =======================================================
     Export memory
     ======================================================= */

  function exportMemory() {
    const payload = {
      messages,
      mood,
      memory,
      settings,
      exportedAt:
        new Date().toISOString(),
      version: "maya-final",
    };

    const blob =
      new Blob(
        [
          JSON.stringify(
            payload,
            null,
            2
          ),
        ],
        {
          type:
            "application/json",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download =
      "maya-memory-export.json";

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
  }

  /* =======================================================
     Import memory
     ======================================================= */

  function importMemory(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      try {
        const parsed =
          JSON.parse(
            reader.result
          );

        if (
          Array.isArray(
            parsed.messages
          )
        ) {
          setMessages(
            parsed.messages
          );
        }

        if (
          typeof parsed.mood ===
            "string" &&
          MOODS[parsed.mood]
        ) {
          setMood(
            parsed.mood
          );
        }

        if (
          Array.isArray(
            parsed.memory
          )
        ) {
          setMemory(
            parsed.memory
          );
        }

        if (
          parsed.settings &&
          typeof parsed.settings ===
            "object"
        ) {
          setSettings(
            (previous) => ({
              ...previous,
              ...parsed.settings,
            })
          );
        }

        triggerReaction(1000);

        alert(
          "Memory Maya berjaya diimport."
        );
      } catch (error) {
        console.error(
          "Memory import error:",
          error
        );

        alert(
          "Fail memory tidak sah."
        );
      }
    };

    reader.onerror = () => {
      alert(
        "Gagal membaca fail memory."
      );
    };

    reader.readAsText(file);

    event.target.value = "";
  }

  /* =======================================================
     Current live status
     ======================================================= */

  const liveStatus = loading
    ? "Thinking..."
    : listening
    ? "Listening..."
    : speaking
    ? "Speaking..."
    : "Online";

  const liveHint = loading
    ? "Maya tengah fikir..."
    : listening
    ? "Maya sedang dengar..."
    : speaking
    ? "Maya sedang bercakap..."
    : "Maya is here";

  /* =======================================================
     Render
     ======================================================= */

  return (
    <main className="mayaApp">
      {/* ===================================================
          TOP BAR
          =================================================== */}

      <header className="mayaTopbar">
        <div className="mayaBrand">
          <div className="mayaBrandIcon">
            M
          </div>

          <div>
            <div className="mayaBrandName">
              {settings.name ||
                "Maya"}
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
            disabled={loading}
          >
            ＋
          </button>

          <button
            type="button"
            className="topActionButton"
            onClick={() =>
              setShowSettings(
                (value) =>
                  !value
              )
            }
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ===================================================
          LIVE AI — STAYS ABOVE CHAT
          =================================================== */}

      <section className="mayaLiveSection">
        <div className="liveHeader">
          <div>
            <div className="liveTitle">
              <span className="liveDot" />
              LIVE AI
            </div>

            <div className="liveSubtitle">
              {liveHint}
            </div>
          </div>

          <div
            className={`liveStatus ${
              loading
                ? "statusThinking"
                : speaking
                ? "statusSpeaking"
                : listening
                ? "statusListening"
                : ""
            }`}
          >
            {liveStatus}
          </div>
        </div>

        <div className="mayaLiveContent">
          <MayaAvatar
            mood={mood}
            loading={loading}
            speaking={speaking}
            listening={listening}
            reacting={reacting}
            blinking={blinking}
          />

          <div className="mayaLiveInfo">
            <div className="mayaLiveName">
              {settings.name ||
                "Maya"}
            </div>

            <div className="mayaLiveMood">
              {currentMood.emoji}{" "}
              {currentMood.label}
            </div>

            <div className="mayaLiveHint">
              {liveHint}
            </div>
          </div>
        </div>

        {/* Mood controls */}

        <div className="moodRow">
          {Object.entries(
            MOODS
          ).map(
            ([id, item]) => (
              <button
                type="button"
                key={id}
                className={`moodButton ${
                  mood === id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleMoodChange(
                    id
                  )
                }
              >
                <span>
                  {item.emoji}
                </span>

                <span>
                  {item.label}
                </span>
              </button>
            )
          )}
        </div>
      </section>

      {/* ===================================================
          SETTINGS
          =================================================== */}

      {showSettings && (
        <section className="settingsPanel">
          <div className="settingsTitle">
            Maya Settings
          </div>

          <label className="settingsField">
            <span>
              Name
            </span>

            <input
              value={
                settings.name
              }
              onChange={(
                event
              ) =>
                setSettings(
                  (
                    previous
                  ) => ({
                    ...previous,
                    name:
                      event
                        .target
                        .value,
                  })
                )
              }
              placeholder="Maya"
            />
          </label>

          <label className="settingsField">
            <span>
              Language
            </span>

            <select
              value={
                settings.language
              }
              onChange={(
                event
              ) =>
                setSettings(
                  (
                    previous
                  ) => ({
                    ...previous,
                    language:
                      event
                        .target
                        .value,
                  })
                )
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

          <label className="settingsField">
            <span>
              Personality
            </span>

            <textarea
              value={
                settings.personality
              }
              onChange={(
                event
              ) =>
                setSettings(
                  (
                    previous
                  ) => ({
                    ...previous,
                    personality:
                      event
                        .target
                        .value,
                  })
                )
              }
              rows={3}
              placeholder="warm, caring, playful..."
            />
          </label>

          <label className="settingsCheck">
            <input
              type="checkbox"
              checked={
                settings.autoSpeak
              }
              onChange={(
                event
              ) =>
                setSettings(
                  (
                    previous
                  ) => ({
                    ...previous,
                    autoSpeak:
                      event
                        .target
                        .checked,
                  })
                )
              }
            />

            <span>
              Auto voice reply
            </span>
          </label>

          <label className="settingsField">
            <span>
              Voice speed:{" "}
              {Number(
                settings.voiceRate
              ).toFixed(1)}
            </span>

            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.1"
              value={
                settings.voiceRate
              }
              onChange={(
                event
              ) =>
                setSettings(
                  (
                    previous
                  ) => ({
                    ...previous,
                    voiceRate:
                      Number(
                        event
                          .target
                          .value
                      ),
                  })
                )
              }
            />
          </label>

          <div className="settingsActions">
            <button
              type="button"
              onClick={
                exportMemory
              }
            >
              Export Memory
            </button>

            <label className="fileButton">
              Import Memory

              <input
                ref={importRef}
                type="file"
                accept="application/json"
                onChange={
                  importMemory
                }
                hidden
              />
            </label>

            <button
              type="button"
              className="dangerButton"
              onClick={
                clearChat
              }
            >
              Clear Memory
            </button>
          </div>
        </section>
      )}

      {/* ===================================================
          CHAT
          ONLY THIS AREA SCROLLS
          =================================================== */}

      <section
        className="mayaChat"
        ref={chatRef}
      >
        {messages.length ===
          0 && (
          <div className="emptyChat">
            <div className="emptyAvatar">
              M
            </div>

            <h2>
              Hi, saya{" "}
              {settings.name ||
                "Maya"}{" "}
              👋
            </h2>

            <p>
              Saya ready untuk
              chat dengan awak.
              Taip mesej,
              gunakan voice atau
              hantar gambar.
            </p>
          </div>
        )}

        {messages.map(
          (
            message,
            index
          ) => {
            const isUser =
              message.role ===
              "user";

            return (
              <div
                key={`${
                  message.timestamp ||
                  index
                }-${index}`}
                className={`messageRow ${
                  isUser
                    ? "userRow"
                    : "mayaRow"
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
                    message.error
                      ? "errorBubble"
                      : ""
                  }`}
                >
                  {message.image && (
                    <img
                      src={
                        message.image
                      }
                      alt="Uploaded"
                      className="messageImage"
                    />
                  )}

                  {message.content && (
                    <div className="messageText">
                      {
                        message.content
                      }
                    </div>
                  )}

                  <div className="messageTime">
                    {new Date(
                      message.timestamp ||
                        Date.now()
                    ).toLocaleTimeString(
                      "ms-MY",
                      {
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                      }
                    )}
                  </div>
                </div>
              </div>
            );
          }
        )}

        {loading && (
          <div className="messageRow mayaRow">
            <div className="messageAvatar">
              M
            </div>

            <div className="messageBubble mayaBubble typingBubble">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </section>

      {/* ===================================================
          IMAGE ATTACHMENT
          =================================================== */}

      {attachment && (
        <div className="attachmentBar">
          <div className="attachmentInfo">
            <img
              src={
                attachment.data
              }
              alt="Preview"
            />

            <div>
              <strong>
                {
                  attachment.name
                }
              </strong>

              <small>
                Image ready
              </small>
            </div>
          </div>

          <button
            type="button"
            onClick={
              removeAttachment
            }
            title="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {/* ===================================================
          NOTICE
          =================================================== */}

      <div className="mayaNotice">
        Maya ialah AI
        companion. Jangan
        kongsi password,
        maklumat kewangan
        atau maklumat sensitif.
      </div>

      {/* ===================================================
          COMPOSER
          =================================================== */}

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
          onChange={
            handleFileChange
          }
          hidden
        />

        <button
          type="button"
          className="composerButton"
          onClick={() =>
            fileRef.current?.click()
          }
          title="Attach image"
          disabled={loading}
        >
          ＋
        </button>

        <button
          type="button"
          className={`composerButton ${
            listening
              ? "activeVoice"
              : ""
          }`}
          onClick={
            startListening
          }
          title="Voice input"
          disabled={loading}
        >
          {listening
            ? "🔴"
            : "🎙️"}
        </button>

        <textarea
          value={input}
          onChange={
            handleInputChange
          }
          onKeyDown={
            handleComposerKeyDown
          }
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
            (!input.trim() &&
              !attachment)
          }
          title="Send"
        >
          ↑
        </button>
      </form>
    </main>
  );
}
