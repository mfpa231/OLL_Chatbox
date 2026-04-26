import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const SUGGESTIONS = [
  "How do I renew my B residence permit?",
  "What are the requirements for Swiss naturalization?",
  "Can I bring my family to Switzerland on a work permit?",
];

function App() {
  const [view, setView] = useState("hero"); // "hero" | "chat"
  const [messages, setMessages] = useState([]);
  const [heroInput, setHeroInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const startChat = () => {
    const text = heroInput.trim();
    if (!text) return;

    setView("chat");
    setMessages([
      {
        sender: "bot",
        text: "Hello — describe your situation and I'll help you find the relevant Swiss federal law references.",
      },
      { sender: "user", text },
    ]);

    // 👇 TEMP: placeholder bot response (replace later with backend call)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "This is a placeholder answer based on Swiss law. (Connect your backend here to return real Fedlex-grounded responses.)",
        },
      ]);
    }, 500);
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setChatInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "This is a placeholder answer based on Swiss law." },
      ]);
    }, 500);
  };

  const resetChat = () => {
    setMessages([]);
    setHeroInput("");
    setView("hero");
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="swiss-mark" aria-hidden="true"></div>
          <div className="brand-text">
            <div className="title">Fedlex Assistant</div>
            <div className="sub">Swiss Law Chatbot</div>
          </div>
        </div>
        <div className="header-meta">
          <span className="dot"></span>
          <span>Online</span>
        </div>
      </header>

      <main className="main">
        {view === "hero" && (
          <section className="hero">
            <div className="hero-inner">
              <div className="hero-eyebrow">
                Swiss Federal Law · Confederation Edition
              </div>

              <h1>
                Navigate Swiss law
                <br />
                with <em>clarity</em>.
              </h1>

              <p>
                An assistant trained on Swiss foreigner law, residency permits,
                and federal procedures. Describe your situation in plain
                language — get grounded answers with references to Fedlex sources.
              </p>

              <div className="suggestions">
                <div className="suggestion-label">Try asking about</div>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="chip"
                    onClick={() => setHeroInput(s)}
                  >
                    <span>{s}</span>
                    <span className="arrow">→</span>
                  </button>
                ))}
              </div>

              <div className="input-row">
                <input
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startChat()}
                  placeholder="Describe your situation…"
                />
                <button onClick={startChat}>
                  Ask <span className="arrow">→</span>
                </button>
              </div>

              <div className="hero-footer">
                <div>Sources · Fedlex.admin.ch</div>
                <div className="languages">
                  <span className="active">EN</span>
                  <span>FR</span>
                  <span>DE</span>
                  <span>IT</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === "chat" && (
          <section className="chat-view">
            <div className="chat-header">
              <div className="label">
                Fedlex <em>Conversation</em>
              </div>
              <button className="new-chat" onClick={resetChat}>
                New Chat
              </button>
            </div>

            <div className="chat-box" ref={chatBoxRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`msg ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <div className="chat-input-row">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Continue the conversation…"
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
