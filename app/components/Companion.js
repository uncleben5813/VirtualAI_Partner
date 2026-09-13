"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE = {
  messages: "maya_messages_v4",
  mood: "maya_mood_v4",
  memory: "maya_memory_v4",
  settings: "maya_settings_v4",
};

const MOODS = {
  happy: { emoji: "😊", label: "Happy", image: "/maya/happy.jpg" },
  caring: { emoji: "❤️", label: "Caring", image: "/maya/caring.jpg" },
  playful: { emoji: "✨", label: "Playful", image: "/maya/playful.jpg" },
  calm: { emoji: "🌙", label: "Calm", image: "/maya/calm.jpg" },
  upset: { emoji: "🥺", label: "Upset", image: "/maya/upset.jpg" },
  surprised: { emoji: "😳", label: "Surprised", image: "/maya/surprised.jpg" },
  angry: { emoji: "😤", label: "Angry", image: "/maya/angry.jpg" },
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
  personality: "Warm, caring, playful, intelligent and emotionally natural",
};

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function imageToData(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    if (file.size > 6_000_000) {
      reject(new Error("Image terlalu besar. Maximum 6MB."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
      });
    };

    reader.onerror = () => {
      reject(new Error("Unable to read image."));
    };

    reader.readAsDataURL(file);
  });
}

function getMessageText(message) {
  if (!message) return "";

  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((item) => item?.type === "text")
      .map((item) => item.text || "")
      .join(" ");
  }

  return "";
}

function MayaLive({
  mood,
  loading,
  speaking,
  listening,
  reacting,
}) {
  const [blink, setBlink] = useState(false);

  const currentMood =
    MOODS[mood] || MOODS.caring;

  useEffect(() => {
    let timer;

    const scheduleBlink = () => {
      const delay =
        2800 + Math.floor(Math.random() * 4200);

      timer = setTimeout(() => {
        setBlink(true);

        setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 150);
      }, delay);
    };

    scheduleBlink();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const mainImage =
    loading
      ? "/maya/thinking.jpg"
      : currentMood.image;

  return (
    <section className="mayaLive">
      <div className="mayaLiveTop">
        <div className="mayaLiveIdentity">
          <div className="mayaMiniAvatar">
            <img
              src={currentMood.image}
              alt="Maya"
            />
          </div>

          <div>
            <strong>Maya</strong>
            <span>
              <i className="liveIndicator" />
              Live
            </span>
          </div>
        </div>

        <div className="mayaLiveState">
          {loading
            ? "Thinking…"
            : speaking
              ? "Speaking…"
              : listening
                ? "Listening…"
                : `${currentMood.emoji} ${currentMood.label}`}
        </div>
      </div>

      <div
        className={[
          "mayaCamera",
          speaking ? "isSpeaking" : "",
          listening ? "isListening" : "",
          reacting ? "isReacting" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="mayaCameraGlow" />

        <div className="mayaPortrait">
          <img
            className="mayaPortraitImage"
            src={mainImage}
            alt="Maya live portrait"
          />

          {blink && (
            <img
              className="mayaBlinkLayer"
              src="/maya/blink.jpg"
              alt=""
              aria-hidden="true"
            />
          )}

          <div className="mayaCameraShade" />

          <div className="mayaLiveBadge">
            <span className="livePulse" />
            LIVE
          </div>
        </div>

        <div className="mayaCameraStatus">
          <span>
            {loading
              ? "Maya is thinking"
              : speaking
                ? "Maya is talking"
                : listening
                  ? "Listening to you"
                  : "Maya is here"}
          </span>

          <span className="moodIndicator">
            {currentMood.emoji}
          </span>
        </div>
      </div>
    </section>
  );
}

export default function Companion() {
  const [messages, setMessages] = useState([
    defaultMessage,
  ]);

  const [mood, setMood] = useState("caring");
  const [memory, setMemory] = useState("");
  const [settings, setSettings] =
    useState(defaultSettings);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] =
    useState(null);
  const [reacting, setReacting] = useState(false);

  const [image, setImage] = useState(null);
  const [showSettings, setShowSettings] =
    useState(false);
  const [notice, setNotice] = useState("");

  const chatRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMessages(
      readStorage(
        STORAGE.messages,
        [defaultMessage]
      )
    );

    setMood(
      readStorage(
        STORAGE.mood,
        "caring"
      )
    );

    try {
      setMemory(
        localStorage.getItem(
          STORAGE.memory
        ) || ""
      );
    } catch {}

    setSettings({
      ...defaultSettings,
      ...readStorage(
        STORAGE.settings,
        {}
      ),
    });
  }, []);

  useEffect(() => {
    saveStorage(
      STORAGE.messages,
      messages
    );
  }, [messages]);

  useEffect(() => {
    saveStorage(
      STORAGE.mood,
      mood
    );
  }, [mood]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE.memory,
        memory
      );
    } catch {}
  }, [memory]);

  useEffect(() => {
    saveStorage(
      STORAGE.settings,
      settings
    );
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
      window.speechSynthesis?.cancel();

      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  const canVoiceInput = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window ||
        "webkitSpeechRecognition" in window)
    );
  }, []);

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function speak(text, index) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    const language =
      settings.language === "English"
        ? "en-US"
        : "ms-MY";

    utterance.lang = language;
    utterance.rate =
      Number(settings.voiceRate) || 1;
    utterance.pitch = 1.02;
    utterance.volume = 1;

    utterance.onstart = () => {
      setSpeakingIndex(index);
    };

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingIndex(null);
    };

    setSpeakingIndex(index);

    window.speechSynthesis.speak(
      utterance
    );
  }

  function startVoiceInput() {
    if (!canVoiceInput || listening) return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      settings.language === "English"
        ? "en-US"
        : "ms-MY";

    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      setNotice("");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const transcript =
          event.results[i][0].transcript;

        if (
          event.results[i].isFinal
        ) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      setInput(
        `${finalText}${interimText}`
      );
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (
        event.error !==
        "aborted"
      ) {
        setNotice(
          `Voice input error: ${event.error}`
        );
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current =
      recognition;

    recognition.start();
  }

  function stopVoiceInput() {
    try {
      recognitionRef.current?.stop();
    } catch {}

    setListening(false);
  }

  async function attachImage(file) {
    try {
      const data =
        await imageToData(file);

      setImage(data);
      setNotice(
        "Image ready. Maya boleh analyse bila kau hantar."
      );
    } catch (error) {
      setNotice(
        error?.message ||
          "Unable to load image."
      );
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();

    const text =
      input.trim();

    if (
      (!text && !image) ||
      loading
    ) {
      return;
    }

    const userContent = image
      ? [
          {
            type: "text",
            text:
              text ||
              "Please analyse this image.",
          },
          {
            type: "image_url",
            image_url: {
              url: image.dataUrl,
            },
          },
        ]
      : text;

    const userMessage = {
      role: "user",
      content: userContent,
      imageName:
        image?.name || null,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);
    setInput("");
    setImage(null);
    setLoading(true);
    setNotice("");

    setReacting(true);

    setTimeout(() => {
      setReacting(false);
    }, 700);

    try {
      const response =
        await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            messages:
              nextMessages.slice(-40),
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
        });

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        !data?.text
      ) {
        throw new Error(
          data?.error ||
            `API request failed (${response.status})`
        );
      }

      const assistantMessage = {
        role: "assistant",
        content: data.text,
        mood: data.mood,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      if (
        data.mood &&
        MOODS[data.mood]
      ) {
        setMood(data.mood);
      }

      if (
        Array.isArray(data.memories) &&
        data.memories.length
      ) {
        setMemory((current) => {
          const existing = current
            ? `${current}\n`
            : "";

          return (
            existing +
            data.memories.join(
              "\n"
            )
          ).trim();
        });
      }

      if (
        settings.autoSpeak
      ) {
        const newIndex =
          nextMessages.length;

        setTimeout(() => {
          speak(
            data.text,
            newIndex
          );
        }, 120);
      }
    } catch (error) {
      console.error(error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            `⚠️ Maya tak dapat jawab sekarang.\n\n${
              error?.message ||
              "Unknown error"
            }\n\nCheck GROQ_API_KEY dalam Vercel.`,
        },
      ]);

      setNotice(
        "Maya API error. Check Vercel environment variables."
      );
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    window.speechSynthesis?.cancel();

    setSpeakingIndex(null);
    setMessages([
      defaultMessage,
    ]);
    setNotice(
      "New conversation started."
    );
  }

  function clearHistory() {
    const ok =
      window.confirm(
        "Padam semua conversation history?"
      );

    if (!ok) return;

    localStorage.removeItem(
      STORAGE.messages
    );

    setMessages([
      defaultMessage,
    ]);

    setNotice(
      "Conversation history cleared."
    );
  }

  function exportData() {
    const backup = {
      version: 4,
      exportedAt:
        new Date().toISOString(),
      messages,
      mood,
      memory,
      settings,
    };

    const blob = new Blob(
      [
        JSON.stringify(
          backup,
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
      "maya-backup.json";

    anchor.click();

    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader =
      new FileReader();

    reader.onload = () => {
      try {
        const data =
          JSON.parse(
            reader.result
          );

        if (
          Array.isArray(
            data.messages
          )
        ) {
          setMessages(
            data.messages
          );
        }

        if (
          typeof data.mood ===
          "string" &&
          MOODS[data.mood]
        ) {
          setMood(data.mood);
        }

        if (
          typeof data.memory ===
          "string"
        ) {
          setMemory(
            data.memory
          );
        }

        if (data.settings) {
          setSettings({
            ...defaultSettings,
            ...data.settings,
          });
        }

        setNotice(
          "Backup restored."
        );
      } catch {
        setNotice(
          "Backup JSON tak sah."
        );
      }
    };

    reader.readAsText(file);
  }

  function saveMemory() {
    try {
      localStorage.setItem(
        STORAGE.memory,
        memory
      );
    } catch {}

    setNotice(
      "Memory saved."
    );
  }

  function renderMessage(message, index) {
    const isUser =
      message.role === "user";

    const text =
      getMessageText(message);

    return (
      <div
        key={`${index}-${message.role}`}
        className={`messageRow ${
          isUser
            ? "user"
            : "maya"
        }`}
      >
        {!isUser && (
          <div className="messageAvatar">
            <img
              src={
                MOODS[
                  message.mood
                ]?.image ||
                "/maya/caring.jpg"
              }
              alt="Maya"
            />
          </div>
        )}

        <div className="messageColumn">
          <div
            className={`messageBubble ${
              isUser
                ? "userBubble"
                : "mayaBubble"
            }`}
          >
            {Array.isArray(
              message.content
            ) &&
              message.content.some(
                (item) =>
                  item?.type ===
                  "image_url"
              ) && (
                <img
                  className="messageImage"
                  src={
                    message.content.find(
                      (item) =>
                        item?.type ===
                        "image_url"
                    )?.image_url
                      ?.url
                  }
                  alt="Uploaded"
                />
              )}

            {text && (
              <div>
                {text}
              </div>
            )}
          </div>

          {!isUser && (
            <button
              className="messageSpeak"
              type="button"
              onClick={() =>
                speak(
                  text,
                  index
                )
              }
            >
              {speakingIndex ===
              index
                ? "🔊 Speaking"
                : "🔈 Listen"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="mayaApp">
      <header className="mayaTopbar">
        <div className="mayaTopLeft">
          <div className="mayaTopAvatar">
            <img
              src={
                MOODS[mood]
                  ?.image ||
                "/maya/caring.jpg"
              }
              alt="Maya"
            />
            <span />
          </div>

          <div>
            <h1>
              {settings.name}
            </h1>

            <p>
              <span className="onlineDot" />
              online
            </p>
          </div>
        </div>

        <div className="mayaTopActions">
          <button
            className="topButton"
            type="button"
            onClick={
              newConversation
            }
            aria-label="New conversation"
          >
            ＋
          </button>

          <button
            className="topButton"
            type="button"
            onClick={() =>
              setShowSettings(
                (value) =>
                  !value
              )
            }
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <MayaLive
        mood={mood}
        loading={loading}
        speaking={
          speakingIndex !==
          null
        }
        listening={
          listening
        }
        reacting={
          reacting
        }
      />

      {showSettings && (
        <aside className="settingsSheet">
          <div className="settingsHeader">
            <div>
              <h2>
                Maya Settings
              </h2>
              <p>
                Settings and memory
                stay on this device.
              </p>
            </div>

            <button
              type="button"
              className="closeSettings"
              onClick={() =>
                setShowSettings(
                  false
                )
              }
            >
              ×
            </button>
          </div>

          <div className="settingsGrid">
            <label>
              Name
              <input
                value={
                  settings.name
                }
                onChange={(event) =>
                  updateSetting(
                    "name",
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label>
              Language
              <select
                value={
                  settings.language
                }
                onChange={(event) =>
                  updateSetting(
                    "language",
                    event.target
                      .value
                  )
                }
              >
                <option>
                  BM + Manglish
                </option>
                <option>
                  Bahasa Melayu
                </option>
                <option>
                  English
                </option>
              </select>
            </label>

            <label>
              Voice speed
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={
                  settings.voiceRate
                }
                onChange={(event) =>
                  updateSetting(
                    "voiceRate",
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label className="checkboxLabel">
              <input
                type="checkbox"
                checked={
                  settings.autoSpeak
                }
                onChange={(event) =>
                  updateSetting(
                    "autoSpeak",
                    event.target
                      .checked
                  )
                }
              />

              Auto voice reply
            </label>

            <label>
              Personality
              <textarea
                value={
                  settings.personality
                }
                onChange={(event) =>
                  updateSetting(
                    "personality",
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label>
              Long-term memory
              <textarea
                value={memory}
                onChange={(event) =>
                  setMemory(
                    event.target
                      .value
                  )
                }
                placeholder="Things Maya should remember..."
              />
            </label>
          </div>

          <div className="settingsButtons">
            <button
              type="button"
              onClick={
                saveMemory
              }
            >
              Save memory
            </button>

            <button
              type="button"
              onClick={
                exportData
              }
            >
              Export
            </button>

            <label className="fileButton">
              Import
              <input
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  const file =
                    event.target
                      .files?.[0];

                  if (file) {
                    importData(
                      file
                    );
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={
                clearHistory
              }
            >
              Clear chat
            </button>
          </div>
        </aside>
      )}

      <section
        ref={chatRef}
        className="mayaChat"
      >
        {messages.map(
          renderMessage
        )}

        {loading && (
          <div className="messageRow maya">
            <div className="messageAvatar">
              <img
                src="/maya/thinking.jpg"
                alt="Maya thinking"
              />
            </div>

            <div className="messageColumn">
              <div className="messageBubble mayaBubble typingBubble">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
      </section>

      {image && (
        <div className="attachmentBar">
          <img
            src={image.dataUrl}
            alt="Attachment preview"
          />

          <div>
            <strong>
              {image.name}
            </strong>
            <span>
              Ready for Maya
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setImage(null)
            }
          >
            ×
          </button>
        </div>
      )}

      {notice && (
        <div className="mayaNotice">
          {notice}
        </div>
      )}

      <form
        className="mayaComposer"
        onSubmit={
          sendMessage
        }
      >
        <input
          ref={fileInputRef}
          className="hiddenInput"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file =
              event.target
                .files?.[0];

            if (file) {
              attachImage(file);
            }

            event.target.value =
              "";
          }}
        />

        <button
          type="button"
          className="composerIcon"
          onClick={() =>
            fileInputRef.current?.click()
          }
          aria-label="Attach image"
        >
          ＋
        </button>

        <div className="composerInput">
          <textarea
            value={input}
            onChange={(event) =>
              setInput(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                  "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                sendMessage(
                  event
                );
              }
            }}
            placeholder={`Message ${settings.name}…`}
            rows={1}
          />
        </div>

        {canVoiceInput && (
          <button
            type="button"
            className={`composerIcon ${
              listening
                ? "recording"
                : ""
            }`}
            onClick={
              listening
                ? stopVoiceInput
                : startVoiceInput
            }
            aria-label="Voice input"
          >
            {listening
              ? "■"
              : "🎙"}
          </button>
        )}

        <button
          type="submit"
          className="sendButton"
          disabled={
            loading ||
            (!input.trim() &&
              !image)
          }
          aria-label="Send"
        >
          ↑
        </button>
      </form>
    </main>
  );
}
