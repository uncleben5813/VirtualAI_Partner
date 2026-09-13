"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const moods = {
  happy: { label: "Happy", emoji: "😊", asset: "happy" },
  caring: { label: "Caring", emoji: "❤️", asset: "caring" },
  playful: { label: "Playful", emoji: "✨", asset: "playful" },
  calm: { label: "Calm", emoji: "🌙", asset: "calm" },
  upset: { label: "Upset", emoji: "🥺", asset: "upset" },
};

const STORAGE = {
  messages: "maya_messages_v4",
  mood: "maya_mood_v4",
  memory: "maya_memory_v4",
  settings: "maya_settings_v4",
};

const defaultSettings = {
  name: "Maya",
  language: "BM + Manglish",
  autoSpeak: false,
  voiceRate: 1,
  personality: "warm, caring, playful, intelligent",
};

function MayaAvatar({ mood, loading, speaking, listening, reacting, blink, talkFrame }) {
  const state = loading ? "thinking" : blink ? "blink" : speaking ? (talkFrame ? "talking" : (moods[mood]?.asset || "calm")) : mood;
  const asset = moods[mood]?.asset || "calm";
  const image = `/maya/${state === "thinking" ? "thinking" : state === "blink" ? "blink" : state === "talking" ? "talking" : asset}.jpg`;

  return (
    <div className={`mayaAvatarWrap ${reacting ? "reacting" : ""} ${speaking ? "speaking" : ""} ${listening ? "listening" : ""}`}>
      <div className="mayaPortraitFrame">
        <img className="mayaPortrait" src={image} alt="Maya" draggable="false" />
        <div className="mayaGlow" />
        {speaking && <div className="mayaVoiceRing" />}
        {listening && <div className="mayaListeningRing" />}
      </div>
    </div>
  );
}

function formatTime(timestamp) {
  return new Date(timestamp || Date.now()).toLocaleTimeString("ms-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const [hydrated, setHydrated] = useState(false);
  const [blink, setBlink] = useState(false);
  const [talkFrame, setTalkFrame] = useState(false);

  const chatRef = useRef(null);
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const recognitionRef = useRef(null);
  const reactionTimerRef = useRef(null);

  const currentMood = useMemo(() => moods[mood] || moods.calm, [mood]);

  useEffect(() => {
    try {
      const savedMessages = JSON.parse(localStorage.getItem(STORAGE.messages) || localStorage.getItem("maya_messages_v3") || "[]");
      const savedMemory = JSON.parse(localStorage.getItem(STORAGE.memory) || localStorage.getItem("maya_memory_v3") || "[]");
      const savedSettings = JSON.parse(localStorage.getItem(STORAGE.settings) || localStorage.getItem("maya_settings_v3") || "null");
      const savedMood = localStorage.getItem(STORAGE.mood) || localStorage.getItem("maya_mood_v3");
      if (Array.isArray(savedMessages)) setMessages(savedMessages);
      if (Array.isArray(savedMemory)) setMemory(savedMemory);
      if (savedSettings && typeof savedSettings === "object") setSettings((p) => ({ ...p, ...savedSettings }));
      if (savedMood && moods[savedMood]) setMood(savedMood);
    } catch (error) {
      console.error("Maya restore failed", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE.messages, JSON.stringify(messages.slice(-80)));
  }, [messages, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE.mood, mood); }, [mood, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE.memory, JSON.stringify(memory.slice(-50))); }, [memory, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE.settings, JSON.stringify(settings)); }, [settings, hydrated]);

  useEffect(() => {
    let timer;
    const scheduleBlink = () => {
      timer = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
        scheduleBlink();
      }, 3200 + Math.random() * 2800);
    };
    scheduleBlink();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!speaking) { setTalkFrame(false); return undefined; }
    const timer = setInterval(() => setTalkFrame((v) => !v), 240);
    return () => clearInterval(timer);
  }, [speaking]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); });
  }, [messages, loading]);

  useEffect(() => () => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    recognitionRef.current?.stop?.();
    window.speechSynthesis?.cancel?.();
  }, []);

  function triggerReaction(duration = 900) {
    setReacting(true);
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => setReacting(false), duration);
  }

  function startListening() {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input tak disokong oleh browser ini. Cuba Chrome atau Safari versi terbaru.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = settings.language === "English" ? "en-US" : "ms-MY";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setListening(true); triggerReaction(1400); };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) transcript += event.results[i][0].transcript;
      setInput(transcript);
      if (transcript.trim()) triggerReaction(700);
    };
    recognition.onerror = (event) => { console.error("Speech recognition", event.error); setListening(false); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setListening(false); }
  }

  function speakText(text) {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.language === "English" ? "en-US" : "ms-MY";
    utterance.rate = Number(settings.voiceRate) || 1;
    utterance.pitch = 1.02;
    utterance.onstart = () => { setSpeaking(true); triggerReaction(1200); };
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { alert("Saiz gambar maksimum ialah 6MB."); event.target.value = ""; return; }
    if (!file.type.startsWith("image/")) { alert("Sila pilih fail gambar."); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => { setAttachment({ name: file.name, type: file.type, data: reader.result }); triggerReaction(800); };
    reader.onerror = () => alert("Gagal membaca gambar.");
    reader.readAsDataURL(file);
  }

  function removeAttachment() {
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if ((!trimmed && !attachment) || loading) return;

    const userMessage = {
      role: "user",
      content: trimmed || "Tolong tengok gambar ini.",
      timestamp: Date.now(),
      ...(attachment ? { image: attachment.data, imageName: attachment.name, imageType: attachment.type } : {}),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = "";
    setLoading(true);
    triggerReaction(1800);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, mood, memory, settings }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Maya gagal memberikan respons.");
      const assistantText = data.text || "Maaf, Maya tak dapat jawab sekarang.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantText, timestamp: Date.now() }]);
      if (data.mood && moods[data.mood]) setMood(data.mood);
      if (Array.isArray(data.memories) && data.memories.length) {
        setMemory((prev) => Array.from(new Set([...prev, ...data.memories])).slice(-50));
      }
      triggerReaction(1100);
      if (settings.autoSpeak) speakText(assistantText);
    } catch (error) {
      console.error("Chat error", error);
      setMessages((prev) => [...prev, { role: "assistant", content: error?.message || "Maaf, Maya mengalami masalah untuk seketika. Cuba lagi.", timestamp: Date.now(), error: true }]);
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    setMessages([]); setInput(""); setAttachment(null); setMood("calm"); triggerReaction(700);
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearMemory() {
    if (!window.confirm("Padam conversation dan memory Maya dalam device ini?")) return;
    setMessages([]); setMemory([]); setMood("calm");
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(STORAGE.mood, "calm");
    localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
    triggerReaction(800);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ messages, mood, memory, settings, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "maya-memory-backup.json"; a.click(); URL.revokeObjectURL(url);
  }

  function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
        if (Array.isArray(parsed.memory)) setMemory(parsed.memory);
        if (moods[parsed.mood]) setMood(parsed.mood);
        if (parsed.settings && typeof parsed.settings === "object") setSettings((p) => ({ ...p, ...parsed.settings }));
        alert("Backup Maya berjaya diimport.");
      } catch { alert("Fail backup tidak sah."); }
    };
    reader.readAsText(file); event.target.value = "";
  }

  return (
    <main className="mayaApp">
      <header className="mayaTopbar">
        <div className="mayaBrand">
          <div className="mayaBrandAvatar"><img src="/maya/calm.jpg" alt="Maya" /></div>
          <div><div className="mayaBrandName">{settings.name || "Maya"}</div><div className="mayaBrandStatus"><span className="onlineDot" /> LIVE AI</div></div>
        </div>
        <div className="mayaTopActions">
          <button type="button" className="topActionButton" onClick={newChat} title="New chat">＋</button>
          <button type="button" className={`topActionButton ${showSettings ? "selected" : ""}`} onClick={() => setShowSettings((v) => !v)} title="Settings">⚙️</button>
        </div>
      </header>

      <section className="mayaLiveSection">
        <div className="liveHeader">
          <div><div className="liveTitle"><span className="liveDot" /> LIVE AI</div><div className="liveSubtitle">Maya stays here while you scroll the chat</div></div>
          <div className="liveStatus">{speaking ? "Speaking" : listening ? "Listening" : loading ? "Thinking" : "Online"}</div>
        </div>
        <div className="mayaLiveContent">
          <MayaAvatar mood={mood} loading={loading} speaking={speaking} listening={listening} reacting={reacting} blink={blink} talkFrame={talkFrame} />
          <div className="mayaLiveInfo">
            <div className="mayaLiveName">{settings.name || "Maya"}</div>
            <div className="mayaLiveMood">{currentMood.emoji} {currentMood.label}</div>
            <div className="mayaLiveHint">{loading ? "Maya tengah fikir..." : listening ? "Maya sedang dengar..." : speaking ? "Maya sedang bercakap..." : reacting ? "Maya reacting..." : "Ready to chat"}</div>
            <div className="liveFeatureRow"><span>● Memory</span><span>● Voice</span><span>● Groq</span></div>
          </div>
        </div>
        <div className="moodRow">
          {Object.entries(moods).map(([id, item]) => <button type="button" key={id} className={`moodButton ${mood === id ? "active" : ""}`} onClick={() => { setMood(id); triggerReaction(700); }}><span>{item.emoji}</span><span>{item.label}</span></button>)}
        </div>
      </section>

      {showSettings && <section className="settingsPanel">
        <div className="settingsTitle">Maya Settings & Personality</div>
        <div className="settingsGrid">
          <label className="settingsField"><span>Name</span><input value={settings.name} onChange={(e) => setSettings((p) => ({ ...p, name: e.target.value }))} /></label>
          <label className="settingsField"><span>Language</span><select value={settings.language} onChange={(e) => setSettings((p) => ({ ...p, language: e.target.value }))}><option>BM + Manglish</option><option>Bahasa Melayu</option><option>English</option></select></label>
          <label className="settingsField wide"><span>Personality</span><input value={settings.personality} onChange={(e) => setSettings((p) => ({ ...p, personality: e.target.value }))} placeholder="warm, caring, playful, intelligent" /></label>
          <label className="settingsCheck"><input type="checkbox" checked={settings.autoSpeak} onChange={(e) => setSettings((p) => ({ ...p, autoSpeak: e.target.checked }))} /><span>Auto voice reply</span></label>
          <label className="settingsField"><span>Voice speed: {Number(settings.voiceRate).toFixed(1)}×</span><input type="range" min="0.7" max="1.3" step="0.1" value={settings.voiceRate} onChange={(e) => setSettings((p) => ({ ...p, voiceRate: Number(e.target.value) }))} /></label>
        </div>
        <div className="settingsActions">
          <button type="button" onClick={exportBackup}>Export Backup</button>
          <button type="button" onClick={() => importRef.current?.click()}>Import Backup</button>
          <button type="button" className="dangerButton" onClick={clearMemory}>Clear Memory</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={importBackup} />
        </div>
        <div className="memoryPreview"><strong>Memory</strong><span>{memory.length ? `${memory.length} remembered item${memory.length > 1 ? "s" : ""}` : "No saved memory yet"}</span></div>
      </section>}

      <section className="mayaChat" ref={chatRef}>
        {messages.length === 0 && <div className="emptyChat"><div className="emptyPortrait"><img src="/maya/calm.jpg" alt="Maya" /></div><h2>Hi, saya Maya 👋</h2><p>Chat dengan Maya, gunakan voice, atau hantar gambar. Memory dan settings akan kekal dalam browser ini.</p><div className="quickPrompts"><button type="button" onClick={() => setInput("Hi Maya, how are you today?")}>How are you?</button><button type="button" onClick={() => setInput("Maya, teman aku borak.")}>Teman borak</button><button type="button" onClick={() => setInput("Maya, apa yang kau ingat tentang aku?")}>My memory</button></div></div>}
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return <div key={`${message.timestamp || index}-${index}`} className={`messageRow ${isUser ? "userRow" : "mayaRow"}`}>
            {!isUser && <div className="messageAvatar"><img src="/maya/calm.jpg" alt="Maya" /></div>}
            <div className={`messageBubble ${isUser ? "userBubble" : "mayaBubble"} ${message.error ? "errorBubble" : ""}`}>
              {message.image && <img src={message.image} alt="Uploaded" className="messageImage" />}
              {message.content && <div className="messageText">{message.content}</div>}
              <div className="messageTime">{formatTime(message.timestamp)}</div>
            </div>
          </div>;
        })}
        {loading && <div className="messageRow mayaRow"><div className="messageAvatar"><img src="/maya/thinking.jpg" alt="Maya" /></div><div className="messageBubble mayaBubble typingBubble"><span /><span /><span /></div></div>}
      </section>

      {attachment && <div className="attachmentBar"><div className="attachmentInfo"><img src={attachment.data} alt="Preview" /><div><strong>{attachment.name}</strong><small>Image ready</small></div></div><button type="button" onClick={removeAttachment}>×</button></div>}
      <div className="mayaNotice">Maya ialah AI companion. Memory disimpan pada browser/device ini.</div>
      <form className="mayaComposer" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <button type="button" className="composerButton" onClick={() => fileRef.current?.click()} title="Attach image">＋</button>
        <button type="button" className={`composerButton ${listening ? "activeVoice" : ""}`} onClick={startListening} title="Voice input">{listening ? "■" : "🎙️"}</button>
        <textarea value={input} onChange={(e) => { setInput(e.target.value); if (e.target.value.trim()) triggerReaction(650); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={listening ? "Maya sedang dengar..." : "Message Maya..."} rows={1} disabled={loading} />
        <button type="submit" className="sendButton" disabled={loading || (!input.trim() && !attachment)} title="Send">↑</button>
      </form>
    </main>
  );
}
