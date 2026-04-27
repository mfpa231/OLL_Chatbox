import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import openLegalLabLogo from "./open-legal-lab.png";
import {
  i18n,
  fieldLabels,
  SWISS_CANTONS,
  SUGGESTIONS,
  parseSyllogism,
  humanizeVariable,
  stripTrailingPeriod,
  getFieldLabel,
  getSubmitLabel,
  resolveFieldMeta,
  validateField,
  formatComputedValue,
  composeNaturalReply,
} from "./shared.js";

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
// FIELD INPUT COMPONENT
// ============================================================
function FieldInput({ field, value, onChange, lang, invalid, disabled, ariaLabel }) {
  const meta = resolveFieldMeta(field);
  const t = i18n[lang] || i18n.en;
  const cls = invalid ? "field-input invalid" : "field-input";
  const a11y = { "aria-label": ariaLabel, "aria-invalid": invalid || undefined };

  if (meta.type === "boolean") {
    return (
      <select className={cls} disabled={disabled} value={value} onChange={(e) => onChange(meta.id, e.target.value)} {...a11y}>
        <option value="">--</option>
        <option value="true">{t.yes}</option>
        <option value="false">{t.no}</option>
      </select>
    );
  }
  if (meta.type === "canton") {
    return (
      <select className={cls} disabled={disabled} value={value} onChange={(e) => onChange(meta.id, e.target.value)} {...a11y}>
        <option value="">--</option>
        {SWISS_CANTONS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    );
  }
  if (meta.type === "select") {
    const pairs = (meta.options && meta.options[lang]) || (meta.options && meta.options.en) || [];
    return (
      <select className={cls} disabled={disabled} value={value} onChange={(e) => onChange(meta.id, e.target.value)} {...a11y}>
        <option value="">--</option>
        {pairs.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>
    );
  }
  if (meta.type === "enum") {
    return (
      <select className={cls} disabled={disabled} value={value} onChange={(e) => onChange(meta.id, e.target.value)} {...a11y}>
        <option value="">--</option>
        {meta.allowed.map((v) => <option key={v} value={String(v)}>{String(v)}</option>)}
      </select>
    );
  }
  if (meta.type === "number") {
    return (
      <input
        className={cls}
        disabled={disabled}
        type="number"
        min={meta.min}
        max={meta.max}
        step={meta.step || "any"}
        value={value}
        onChange={(e) => onChange(meta.id, e.target.value)}
        {...a11y}
      />
    );
  }
  return (
    <input
      className={cls}
      disabled={disabled}
      type="text"
      value={value}
      onChange={(e) => onChange(meta.id, e.target.value)}
      {...a11y}
    />
  );
}

// ============================================================
// MISSING FIELDS FORM COMPONENT
// ============================================================
function MissingFieldsForm({ fields, lang, onSubmit, disabled }) {
  const t = i18n[lang] || i18n.en;
  const [values, setValues] = useState(() => {
    const init = {};
    fields.forEach((f) => { init[typeof f === "object" ? f.id : f] = ""; });
    return init;
  });
  const [errors, setErrors] = useState({});

  const handleChange = (id, val) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    if (errors[id]) setErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    const parsed = {};
    let anyFilled = false;
    fields.forEach((field) => {
      const meta = resolveFieldMeta(field);
      const raw = values[meta.id]?.trim();
      if (!raw) return;
      const err = validateField(field, raw, lang);
      if (err) { nextErrors[meta.id] = err; return; }
      anyFilled = true;
      if (meta.type === "boolean") parsed[meta.id] = raw === "true";
      else if (meta.type === "number") parsed[meta.id] = Number(raw);
      else parsed[meta.id] = raw;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0 && anyFilled) onSubmit(parsed);
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (e.target.tagName === "SELECT") {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  };

  return (
    <div className="msg bot">
      <p>{t.missingFieldsIntro}</p>
      <form className="missing-fields-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
        <div className="missing-fields-grid">
          {fields.map((field, i) => {
            const id = typeof field === "object" ? field.id : field;
            const fieldId = typeof field === "object" ? field.id : field;
            const localLabel = fieldLabels[fieldId]?.[lang];
            const label = localLabel
              || (typeof field === "object" ? field.description : null)
              || getFieldLabel(fieldId, lang);
            const lawRef = typeof field === "object" ? field.law_reference : null;
            const error = errors[id];
            return (
              <div className="field-group" key={i}>
                <label className="field-label">
                  {label}
                  {lawRef && <span className="law-ref">({lawRef})</span>}
                </label>
                <FieldInput field={field} value={values[id]} onChange={handleChange} lang={lang} invalid={Boolean(error)} disabled={disabled} ariaLabel={typeof label === "string" ? label : undefined} />
                {error && <span className="field-error" role="alert">{error}</span>}
              </div>
            );
          })}
        </div>
        <div className="missing-fields-submit">
          <button type="submit" disabled={disabled} aria-busy={disabled || undefined}>
            {disabled
              ? <span className="btn-loading" aria-label={getSubmitLabel(lang)}><span></span><span></span><span></span></span>
              : getSubmitLabel(lang)}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// LEGAL ANSWER
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
    return <div className="msg bot"><p>{t.noLaws}</p></div>;
  }

  let mainParagraphs;
  const hasLegalReasoning = typeof data.legal_reasoning === "string" && data.legal_reasoning.trim().length > 0;

  if (hasLegalReasoning) {
    mainParagraphs = data.legal_reasoning.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  } else {
    mainParagraphs = composeNaturalReply({
      syllogism, applicableLaws, articleToComputed,
      executionFailed: data.execution && !data.execution.success && !data._suppressExecFailNote,
      lang, t,
    });
  }

  const excludedBlocks = syllogism.filter(
    (s) => s.article && !applicableLaws.some((l) => s.article.startsWith(l))
  );
  let excludedParagraph = null;
  if (hasLegalReasoning && excludedBlocks.length) {
    const excludedSentences = excludedBlocks
      .map((b) => { const c = b.premises.find((p) => p.type === "conclusion"); return c ? stripTrailingPeriod(c.text) + "." : null; })
      .filter(Boolean);
    if (excludedSentences.length) excludedParagraph = `${t.alsoConsidered} ${excludedSentences.join(" ")}`;
  }

  const cvEntries = Object.entries(computedValues);
  const legalReasoningText = hasLegalReasoning ? data.legal_reasoning : "";
  const showComputed = data.execution?.success && cvEntries.length > 0 &&
    !cvEntries.every(([, v]) => legalReasoningText.includes(String(v)));

  return (
    <div className="msg bot">
      {mainParagraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
      {excludedParagraph && <p>{excludedParagraph}</p>}
      {showComputed && (
        <div className="computed-results">
          <strong>{t.computedResults}</strong>
          <ul>
            {cvEntries.map(([variable, value]) => (
              <li key={variable}>
                <span className="label">{humanizeVariable(variable)}: </span>
                <span className="value">{formatComputedValue(value, variable, t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {applicableLaws.length > 0 && (
        <div className="legal-citations">{t.legalBasis}: {applicableLaws.join(", ")}</div>
      )}
      {data._errorFootnote && <div className="error-footnote">{data._errorFootnote}</div>}
      {data.processing_time_seconds != null && (
        <div className="processing-time">{t.processedIn} {data.processing_time_seconds.toFixed(1)}s</div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [view, setView] = useState("hero");
  const [messages, setMessages] = useState([]);
  const [heroInput, setHeroInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState("fr");
  const [pendingFields, setPendingFields] = useState([]);
  const [initialDescription, setInitialDescription] = useState("");
  const [knownParameters, setKnownParameters] = useState({});
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages, isLoading]);

  const processQuery = async (text) => {
    setMessages((prev) => [...prev, { type: "user", text }]);
    if (!initialDescription) setInitialDescription(text);
    const fullContext = initialDescription ? initialDescription + "\n\n" + text : text;
    setIsLoading(true);
    const payload = { case_description: fullContext, execute: true, language: lang };
    if (Object.keys(knownParameters).length > 0) payload.known_parameters = knownParameters;

    try {
      const data = await callBackend(payload);
      if (data.input_parameters) {
        const merged = { ...knownParameters };
        Object.values(data.input_parameters).forEach((params) => {
          if (params && typeof params === "object") {
            Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined) merged[k] = v; });
          }
        });
        setKnownParameters(merged);
      }
      if (data.error) {
        const hasLaws = Array.isArray(data.applicable_laws) && data.applicable_laws.length > 0;
        if (hasLaws) {
          data._errorFootnote = data.error;
          setPendingFields([]);
          setMessages((prev) => [...prev, { type: "answer", data }]);
        } else {
          setMessages((prev) => [...prev, { type: "bot_error", text: data.error }]);
        }
      } else {
        const missing = Array.isArray(data.missing_parameters) ? data.missing_parameters : [];
        if (missing.length > 0) {
          setPendingFields(missing);
          setMessages((prev) => [...prev, { type: "missing_fields", fields: missing }]);
        } else {
          setPendingFields([]);
          setMessages((prev) => [...prev, { type: "answer", data }]);
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { type: "error", text: "Backend error: " + err.message }]);
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
    setPendingFields([]);
    setInitialDescription("");
    setKnownParameters({});
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
              <div className="hero-eyebrow">Swiss Federal Law &middot; Confederation Edition</div>
              <h1>Navigate Swiss law<br />with <em>clarity</em>.</h1>
              <p>Describe your situation in plain language &mdash; get grounded answers with references to Fedlex sources with our assistant.</p>
              <div className="suggestions">
                <div className="suggestion-label">Try asking about</div>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="chip" onClick={() => setHeroInput(s)}>
                    <span>{s}</span>
                    <span className="arrow">&rarr;</span>
                  </button>
                ))}
              </div>
              <div className="input-row">
                <input
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startChat()}
                  placeholder="Describe your situation&hellip;"
                />
                <button onClick={startChat}>Ask <span className="arrow">&rarr;</span></button>
              </div>
              <div className="hero-footer">
                <div>Sources &middot; Fedlex.admin.ch</div>
                <div className="languages">
                  {["en", "fr", "de", "it"].map((l) => (
                    <span key={l} className={lang === l ? "active" : ""} onClick={() => setLang(l)}>{l.toUpperCase()}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {view === "chat" && (
          <section className="chat-view visible">
            <div className="chat-header">
              <div className="label">Fedlex <em>Conversation</em></div>
              <div className="chat-header-actions">
                <div className="lang-toggle">
                  {["en", "fr", "de", "it"].map((l) => (
                    <button key={l} className={lang === l ? "active" : ""} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
                  ))}
                </div>
                <button className="new-chat" onClick={resetChat}>New Chat</button>
              </div>
            </div>

            <div className="chat-box" ref={chatBoxRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
              {messages.map((msg, i) => {
                if (msg.type === "user") return <div key={i} className="msg user">{msg.text}</div>;
                if (msg.type === "answer") return <LegalAnswer key={i} data={msg.data} lang={lang} />;
                if (msg.type === "missing_fields") {
                  return (
                    <MissingFieldsForm
                      key={i}
                      fields={msg.fields}
                      lang={lang}
                      disabled={isLoading}
                      onSubmit={(parsed) => {
                        setKnownParameters((prev) => ({ ...prev, ...parsed }));
                        const summary = Object.entries(parsed).map(([k, v]) => `${humanizeVariable(k)}: ${v}`).join(", ");
                        processQuery(summary);
                      }}
                    />
                  );
                }
                if (msg.type === "bot_error") return <div key={i} className="msg bot"><p>{msg.text}</p></div>;
                if (msg.type === "error") return <div key={i} className="exec-error" role="alert">{msg.text}</div>;
                return null;
              })}
              {isLoading && (
                <div className="typing" role="status" aria-label={(i18n[lang] || i18n.en).loading}>
                  <span aria-hidden="true"></span>
                  <span aria-hidden="true"></span>
                  <span aria-hidden="true"></span>
                </div>
              )}
            </div>

            <div className="chat-input-area">
              <div className="chat-input-row">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Continue the conversation&hellip;"
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
