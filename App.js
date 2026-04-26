import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import openLegalLabLogo from "./open-legal-lab.png";

// ============================================================
// BACKEND API
// ============================================================
const API_URL = "http://vps-13d3e726.vps.ovh.net:8040/api/v1/classify";

async function callBackend(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
  }

  return await res.json();
}

// ============================================================
// I18N — natural conversational phrases
// ============================================================
const i18n = {
  en: {
    concretely: "In concrete terms,",
    chf: "CHF",
    perMonth: "per month",
    alsoConsidered: "I also considered some other rules that don't apply here:",
    execFailNote: "I wasn't able to compute the exact figures due to a technical issue, but the legal reasoning above still holds.",
    noLaws: "I couldn't identify any applicable Swiss federal law articles for this situation. Could you give me more details?",
  },
  fr: {
    concretely: "Concrètement,",
    chf: "CHF",
    perMonth: "par mois",
    alsoConsidered: "J'ai aussi examiné d'autres règles qui ne s'appliquent pas ici :",
    execFailNote: "Je n'ai pas pu calculer le montant exact en raison d'un problème technique, mais le raisonnement juridique ci-dessus reste valide.",
    noLaws: "Je n'ai pas pu identifier d'articles de droit fédéral applicables à cette situation. Pourriez-vous me donner plus de détails ?",
  },
  de: {
    concretely: "Konkret,",
    chf: "CHF",
    perMonth: "pro Monat",
    alsoConsidered: "Ich habe auch andere Regeln geprüft, die hier nicht gelten:",
    execFailNote: "Ich konnte den genauen Betrag aufgrund eines technischen Problems nicht berechnen, aber die rechtliche Argumentation bleibt gültig.",
    noLaws: "Für diese Situation konnten keine anwendbaren Artikel des Bundesrechts identifiziert werden. Könnten Sie mir weitere Details geben?",
  },
};

// ============================================================
// SYLLOGISM PARSER — handles two formats:
//   FORMAT A (English): "For **Article — Title**:\n- Major premise: ..."
//   FORMAT B (French) : "Major Premise: ...\n\nMinor Premise: ...\n\nConclusion: ..."
//                       blocks separated by "---"
// ============================================================
function parseSyllogism(text) {
  if (!text) return [];

  // Detect format B: blocks separated by "---"
  if (text.includes("---")) {
    return text
      .split(/\n*---\n*/)
      .map((b) => b.trim())
      .filter(Boolean)
      .map((block) => {
        const premises = [];
        const lines = block.split(/\n+/);
        let currentType = null;
        let buffer = [];

        const flush = () => {
          if (currentType && buffer.length) {
            premises.push({ type: currentType, text: buffer.join(" ").trim() });
          }
          buffer = [];
        };

        lines.forEach((line) => {
          const m = line.match(/^\s*(Major\s*Premise|Minor\s*Premise|Conclusion)\s*:\s*(.*)/i);
          if (m) {
            flush();
            currentType = m[1].toLowerCase().includes("major") ? "major"
                        : m[1].toLowerCase().includes("minor") ? "minor"
                        : "conclusion";
            if (m[2]) buffer.push(m[2]);
          } else if (currentType) {
            buffer.push(line);
          }
        });
        flush();

        // Try to extract an article reference from major premise (e.g. "art. 3 AHVG", "art. 41 CO")
        const major = premises.find((p) => p.type === "major");
        const articleMatch = major
          ? major.text.match(/art\.\s*(\d+[a-z]?)\s*([A-Z]{2,5})/i)
          : null;
        const article = articleMatch
          ? `${articleMatch[2].toUpperCase()} Art. ${articleMatch[1]}`
          : "";

        return { article, premises };
      });
  }

  // FORMAT A (English bullet list)
  return text
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const headerMatch = block.match(/\*\*([^*]+)\*\*/);
      const article = headerMatch ? headerMatch[1].trim() : "";
      const premises = block
        .split("\n")
        .slice(1)
        .map((line) => {
          const m = line.match(/-\s*(Major premise|Minor premise|Conclusion)\s*:\s*(.+)/i);
          if (!m) return null;
          const type = m[1].toLowerCase().includes("major") ? "major"
                     : m[1].toLowerCase().includes("minor") ? "minor"
                     : "conclusion";
          return { type, text: m[2].trim() };
        })
        .filter(Boolean);
      return { article, premises };
    });
}

// ============================================================
// HELPERS
// ============================================================
function humanizeVariable(v) {
  return v.replace(/_/g, " ").replace(/\bahv\b/gi, "AHV");
}

function formatValue(v) {
  if (typeof v === "boolean") return v ? "✓ true" : "✕ false";
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v);
}

function articleMatchesApplicable(blockArticle, applicableLaws) {
  // blockArticle could be "AHVG Art. 3", "AHVG Art. 3 — AHV Insurance Obligation", "AHVG Art. 10", etc.
  return applicableLaws.some((l) => blockArticle.startsWith(l));
}

const SUGGESTIONS = [
  "Anna works in Zurich earning 85000 CHF/year as an employee",
  "How do I renew my B residence permit?",
  "What are the requirements for Swiss naturalization?",
];

// ============================================================
// LEGAL ANSWER — fully conversational, flowing prose
// ============================================================
function LegalAnswer({ data, lang }) {
  const t = i18n[lang] || i18n.en;
  const syllogism = parseSyllogism(data.syllogistic_reasoning);
  const applicableLaws = data.applicable_laws || [];
  const computedValues = data.execution?.computed_values || {};

  const articleToComputed = {};
  (data.code_generation || []).forEach((cg) => {
    if (computedValues[cg.openfisca_variable] !== undefined) {
      articleToComputed[cg.article_reference] = {
        variable: cg.openfisca_variable,
        value: computedValues[cg.openfisca_variable],
      };
    }
  });

  if (applicableLaws.length === 0) {
    return (
      <div className="msg bot">
        <p>{t.noLaws}</p>
      </div>
    );
  }

  const text = composeNaturalReply({
    syllogism,
    applicableLaws,
    articleToComputed,
    executionFailed: data.execution && !data.execution.success,
    lang,
    t,
  });

  return (
    <div className="msg bot">
      {text.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

// Builds an array of paragraph strings that read like a human reply.
// Uses minor premise + conclusion from the tree, plus computed values when available.
function composeNaturalReply({ syllogism, applicableLaws, articleToComputed, executionFailed, lang, t }) {
  const applicableBlocks = syllogism.filter(
    (s) => s.article && applicableLaws.some((l) => s.article.startsWith(l))
  );
  const excludedBlocks = syllogism.filter(
    (s) => s.article && !applicableLaws.some((l) => s.article.startsWith(l))
  );

  const paragraphs = [];

  // Opening paragraph: weave the minor premises (facts) + applicable conclusions into prose
  const sentences = [];
  applicableBlocks.forEach((block, i) => {
    const minor = block.premises.find((p) => p.type === "minor");
    const conclusion = block.premises.find((p) => p.type === "conclusion");
    const articleRef = applicableLaws.find((l) => block.article.startsWith(l)) || block.article;
    const computed = articleToComputed[articleRef];

    if (i === 0 && minor) {
      // First sentence: lead with the situation as Claude understood it
      sentences.push(stripTrailingPeriod(minor.text) + ".");
    }

    if (conclusion) {
      let s = stripTrailingPeriod(conclusion.text);
      if (computed && typeof computed.value === "number" && computed.variable.includes("contribution")) {
        const amount = computed.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
        s += ` ${t.concretely.toLowerCase()} ${amount} ${t.chf} ${t.perMonth}`;
      }
      sentences.push(s + ".");
    }
  });

  if (sentences.length) {
    paragraphs.push(sentences.join(" "));
  }

  // Second paragraph: ruled-out articles, but phrased softly
  if (excludedBlocks.length) {
    const excludedSentences = excludedBlocks
      .map((b) => {
        const conclusion = b.premises.find((p) => p.type === "conclusion");
        return conclusion ? stripTrailingPeriod(conclusion.text) + "." : null;
      })
      .filter(Boolean);
    if (excludedSentences.length) {
      paragraphs.push(`${t.alsoConsidered} ${excludedSentences.join(" ")}`);
    }
  }

  // Soft footnote about execution failure, only if it happened
  if (executionFailed) {
    paragraphs.push(t.execFailNote);
  }

  return paragraphs;
}

function stripTrailingPeriod(s) {
  return s ? s.replace(/[.\s]+$/, "") : s;
}

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [view, setView] = useState("hero");
  const [messages, setMessages] = useState([]); // { type: 'user'|'answer'|'error', text?, data? }
  const [heroInput, setHeroInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState("fr");
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const processQuery = async (text) => {
    setMessages((prev) => [...prev, { type: "user", text }]);
    setIsLoading(true);

    const payload = { case_description: text, execute: true, language: lang };

    try {
      const data = await callBackend(payload);
      setMessages((prev) => [...prev, { type: "answer", data }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { type: "error", text: "Backend error: " + err.message },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startChat = () => {
    const text = heroInput.trim();
    if (!text) return;
    setView("chat");
    processQuery(text);
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    processQuery(text);
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
          <div className="brand-divider"></div>
          <img src={openLegalLabLogo} alt="Open Legal Lab" className="partner-logo" />
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
              <div className="hero-eyebrow">Swiss Federal Law · Confederation Edition</div>

              <h1>
                Navigate Swiss law<br />with <em>clarity</em>.
              </h1>

              <p>
                Describe your situation in plain language — get grounded answers with
                references to Fedlex sources with our assistant.
              </p>

              <div className="suggestions">
                <div className="suggestion-label">Try asking about</div>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="chip" onClick={() => setHeroInput(s)}>
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
                  {["en", "fr", "de", "it"].map((l) => (
                    <span
                      key={l}
                      className={lang === l ? "active" : ""}
                      onClick={() => setLang(l)}
                    >
                      {l.toUpperCase()}
                    </span>
                  ))}
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
              <div className="chat-header-actions">
                <div className="lang-toggle">
                  {["en", "fr", "de"].map((l) => (
                    <button
                      key={l}
                      className={lang === l ? "active" : ""}
                      onClick={() => setLang(l)}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button className="new-chat" onClick={resetChat}>
                  New Chat
                </button>
              </div>
            </div>

            <div className="chat-box" ref={chatBoxRef}>
              {messages.map((msg, i) => {
                if (msg.type === "user") {
                  return <div key={i} className="msg user">{msg.text}</div>;
                }
                if (msg.type === "answer") {
                  return <LegalAnswer key={i} data={msg.data} lang={lang} />;
                }
                if (msg.type === "error") {
                  return <div key={i} className="exec-error">{msg.text}</div>;
                }
                return null;
              })}
              {isLoading && (
                <div className="typing">
                  <span></span><span></span><span></span>
                </div>
              )}
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
