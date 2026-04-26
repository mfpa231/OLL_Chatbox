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
    missingFieldsIntro: "To provide a complete legal analysis, I still need the following information:",
    missingFieldsOutro: "Please provide these details so I can give you a precise answer.",
    computedResults: "Computed results:",
    yes: "Yes",
    no: "No",
    legalBasis: "Legal basis",
    processedIn: "Processed in",
  },
  fr: {
    concretely: "Concrètement,",
    chf: "CHF",
    perMonth: "par mois",
    alsoConsidered: "J'ai aussi examiné d'autres règles qui ne s'appliquent pas ici :",
    execFailNote: "Je n'ai pas pu calculer le montant exact en raison d'un problème technique, mais le raisonnement juridique ci-dessus reste valide.",
    noLaws: "Je n'ai pas pu identifier d'articles de droit fédéral applicables à cette situation. Pourriez-vous me donner plus de détails ?",
    missingFieldsIntro: "Pour fournir une analyse juridique complète, j'ai encore besoin des informations suivantes :",
    missingFieldsOutro: "Veuillez fournir ces détails afin que je puisse vous donner une réponse précise.",
    computedResults: "Résultats calculés :",
    yes: "Oui",
    no: "Non",
    legalBasis: "Base légale",
    processedIn: "Traité en",
  },
  de: {
    concretely: "Konkret,",
    chf: "CHF",
    perMonth: "pro Monat",
    alsoConsidered: "Ich habe auch andere Regeln geprüft, die hier nicht gelten:",
    execFailNote: "Ich konnte den genauen Betrag aufgrund eines technischen Problems nicht berechnen, aber die rechtliche Argumentation bleibt gültig.",
    noLaws: "Für diese Situation konnten keine anwendbaren Artikel des Bundesrechts identifiziert werden. Könnten Sie mir weitere Details geben?",
    missingFieldsIntro: "Um eine vollständige rechtliche Analyse zu erstellen, benötige ich noch folgende Informationen:",
    missingFieldsOutro: "Bitte geben Sie diese Details an, damit ich Ihnen eine genaue Antwort geben kann.",
    computedResults: "Berechnete Ergebnisse:",
    yes: "Ja",
    no: "Nein",
    legalBasis: "Rechtsgrundlage",
    processedIn: "Verarbeitet in",
  },
  it: {
    concretely: "Concretamente,",
    chf: "CHF",
    perMonth: "al mese",
    alsoConsidered: "Ho anche considerato altre regole che non si applicano in questo caso:",
    execFailNote: "Non sono riuscito a calcolare l'importo esatto a causa di un problema tecnico, ma il ragionamento giuridico sopra resta valido.",
    noLaws: "Non sono riuscito a identificare articoli di diritto federale applicabili a questa situazione. Potrebbe fornirmi maggiori dettagli?",
    missingFieldsIntro: "Per fornire un'analisi giuridica completa, ho ancora bisogno delle seguenti informazioni:",
    missingFieldsOutro: "Vi prego di fornire questi dettagli affinché possa darvi una risposta precisa.",
    computedResults: "Risultati calcolati:",
    yes: "Sì",
    no: "No",
    legalBasis: "Base giuridica",
    processedIn: "Elaborato in",
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
  "My neighbor's tree fell on my car during a storm, who is liable for the damage?",
  "I'm a 20-year-old student living in Bern, can I get a scholarship for my university studies?",
];

// ============================================================
// FIELD LABELS — i18n mapping for missing field prompts
// ============================================================
const fieldLabels = {
  income: { en: "Income", fr: "Revenu", de: "Einkommen", it: "Reddito" },
  canton: { en: "Canton of residence", fr: "Canton de résidence", de: "Wohnkanton", it: "Cantone di residenza" },
  employment_status: { en: "Employment status", fr: "Statut d'emploi", de: "Beschäftigungsstatus", it: "Stato occupazionale" },
  age: { en: "Age", fr: "Âge", de: "Alter", it: "Età" },
  nationality: { en: "Nationality", fr: "Nationalité", de: "Staatsangehörigkeit", it: "Nazionalità" },
  marital_status: { en: "Marital status", fr: "État civil", de: "Zivilstand", it: "Stato civile" },
  num_children: { en: "Number of children", fr: "Nombre d'enfants", de: "Anzahl Kinder", it: "Numero di figli" },
  residence_permit: { en: "Residence permit type", fr: "Type de permis de séjour", de: "Aufenthaltsbewilligung", it: "Tipo di permesso di soggiorno" },
  years_in_switzerland: { en: "Years in Switzerland", fr: "Années en Suisse", de: "Jahre in der Schweiz", it: "Anni in Svizzera" },
  employer_type: { en: "Employer type", fr: "Type d'employeur", de: "Arbeitgebertyp", it: "Tipo di datore di lavoro" },
  weekly_hours: { en: "Weekly working hours", fr: "Heures de travail hebdomadaires", de: "Wöchentliche Arbeitsstunden", it: "Ore di lavoro settimanali" },
  church_member: { en: "Church membership", fr: "Appartenance à une église", de: "Kirchenmitgliedschaft", it: "Appartenenza a una chiesa" },
  salary: { en: "Salary", fr: "Salaire", de: "Gehalt", it: "Stipendio" },
  tax_class: { en: "Tax class", fr: "Classe d'impôt", de: "Steuerklasse", it: "Classe fiscale" },
  work_canton: { en: "Canton of employment", fr: "Canton d'emploi", de: "Arbeitskanton", it: "Cantone di lavoro" },
  occupation: { en: "Occupation", fr: "Profession", de: "Beruf", it: "Professione" },
  self_employed: { en: "Self-employed status", fr: "Statut indépendant", de: "Selbstständigkeitsstatus", it: "Stato di lavoratore autonomo" },
  birth_date: { en: "Date of birth", fr: "Date de naissance", de: "Geburtsdatum", it: "Data di nascita" },
  gender: { en: "Gender", fr: "Genre", de: "Geschlecht", it: "Geschlecht" },
  syllogistic_reasoning: { en: "Legal reasoning", fr: "Raisonnement juridique", de: "Rechtliche Begründung", it: "Ragionamento giuridico" },
  applicable_laws: { en: "Applicable laws", fr: "Lois applicables", de: "Anwendbare Gesetze", it: "Leggi applicabili" },
  execution: { en: "Computation results", fr: "Résultats de calcul", de: "Berechnungsergebnisse", it: "Risultati del calcolo" },
};

function getFieldLabel(fieldKey, lang) {
  const entry = fieldLabels[fieldKey];
  if (entry && entry[lang]) return entry[lang];
  if (entry && entry.en) return entry.en;
  return humanizeVariable(fieldKey);
}

// ============================================================
// MISSING FIELDS MESSAGE COMPONENT
// ============================================================
function MissingFieldsMessage({ fields, lang }) {
  const t = i18n[lang] || i18n.en;
  return (
    <div className="msg bot">
      <p>{t.missingFieldsIntro}</p>
      <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
        {fields.map((field, i) => {
          const label = typeof field === 'object'
            ? (field.description || getFieldLabel(field.id, lang))
            : getFieldLabel(field, lang);
          const lawRef = typeof field === 'object' ? field.law_reference : null;
          return (
            <li key={i}>
              {label}
              {lawRef && <span className="law-ref">({lawRef})</span>}
            </li>
          );
        })}
      </ul>
      <p>{t.missingFieldsOutro}</p>
    </div>
  );
}

// ============================================================
// LEGAL ANSWER — fully conversational, flowing prose
// ============================================================
function formatComputedValue(value, variable, t) {
  if (typeof value === "boolean") return value ? t.yes : t.no;
  if (typeof value === "number") {
    const formatted = Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const monetary = /amount|contribution|salary|income|wage|tax|chf|franc|betrag|beitrag|revenu|salaire|reddito/i;
    return monetary.test(variable) ? `CHF ${formatted}` : formatted;
  }
  return String(value);
}

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

  // Use legal_reasoning from server if available, fallback to client-side compose
  let mainParagraphs;
  const hasLegalReasoning = typeof data.legal_reasoning === "string" && data.legal_reasoning.trim().length > 0;

  if (hasLegalReasoning) {
    mainParagraphs = data.legal_reasoning.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  } else {
    mainParagraphs = composeNaturalReply({
      syllogism,
      applicableLaws,
      articleToComputed,
      executionFailed: data.execution && !data.execution.success && !data._suppressExecFailNote,
      lang,
      t,
    });
  }

  // Excluded articles paragraph (from syllogism, always)
  const excludedBlocks = syllogism.filter(
    (s) => s.article && !applicableLaws.some((l) => s.article.startsWith(l))
  );
  let excludedParagraph = null;
  if (hasLegalReasoning && excludedBlocks.length) {
    const excludedSentences = excludedBlocks
      .map((b) => {
        const conclusion = b.premises.find((p) => p.type === "conclusion");
        return conclusion ? stripTrailingPeriod(conclusion.text) + "." : null;
      })
      .filter(Boolean);
    if (excludedSentences.length) {
      excludedParagraph = `${t.alsoConsidered} ${excludedSentences.join(" ")}`;
    }
  }

  // Computed values block — show all, skip if legal_reasoning already contains them
  const cvEntries = Object.entries(computedValues);
  const legalReasoningText = hasLegalReasoning ? data.legal_reasoning : "";
  const showComputed = data.execution?.success && cvEntries.length > 0 &&
    !cvEntries.every(([, v]) => legalReasoningText.includes(String(v)));

  return (
    <div className="msg bot">
      {mainParagraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}

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
        <div className="legal-citations">
          {t.legalBasis}: {applicableLaws.join(", ")}
        </div>
      )}

      {data._errorFootnote && (
        <div className="error-footnote">{data._errorFootnote}</div>
      )}

      {data.processing_time_seconds != null && (
        <div className="processing-time">
          {t.processedIn} {data.processing_time_seconds.toFixed(1)}s
        </div>
      )}
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
  const [messages, setMessages] = useState([]); // { type: 'user'|'answer'|'missing_fields'|'error', text?, data?, fields? }
  const [heroInput, setHeroInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState("fr");
  const [pendingFields, setPendingFields] = useState([]);
  const [initialDescription, setInitialDescription] = useState("");
  const [knownParameters, setKnownParameters] = useState({});
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const processQuery = async (text) => {
    setMessages((prev) => [...prev, { type: "user", text }]);

    if (!initialDescription) {
      setInitialDescription(text);
    }
    const fullContext = initialDescription
      ? initialDescription + "\n\n" + text
      : text;
    setIsLoading(true);

    const payload = { case_description: fullContext, execute: true, language: lang };
    if (Object.keys(knownParameters).length > 0) {
      payload.known_parameters = knownParameters;
    }

    try {
      const data = await callBackend(payload);

      // Merge input_parameters into knownParameters for follow-ups
      if (data.input_parameters) {
        const merged = { ...knownParameters };
        Object.values(data.input_parameters).forEach((params) => {
          if (params && typeof params === "object") {
            Object.entries(params).forEach(([k, v]) => {
              if (v !== null && v !== undefined) merged[k] = v;
            });
          }
        });
        setKnownParameters(merged);
      }

      // Handle top-level error from backend
      if (data.error) {
        const hasLaws = Array.isArray(data.applicable_laws) && data.applicable_laws.length > 0;
        if (hasLaws) {
          // Show legal answer with error as footnote
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
                  {["en", "fr", "de", "it"].map((l) => (
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
                if (msg.type === "missing_fields") {
                  return <MissingFieldsMessage key={i} fields={msg.fields} lang={lang} />;
                }
                if (msg.type === "bot_error") {
                  return <div key={i} className="msg bot"><p>{msg.text}</p></div>;
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
