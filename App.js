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

// ============================================================
// ESSENTIAL FIELDS — fields required for complete computation
// ============================================================
const ESSENTIAL_FIELDS = [
  'canton', 'marital_status', 'num_children', 'age', 'church_member', 'nationality'
];

// Scans conversation text to find which essential fields are still missing
function inferMissingEssentialFields(data, conversationText) {
  const text = conversationText.toLowerCase();

  const cantonPatterns = /\b(zurich|zürich|bern|berne|luzern|lucerne|uri|schwyz|obwalden|nidwalden|glarus|zug|fribourg|freiburg|solothurn|soleure|basel|baselland|schaffhausen|schaffhouse|appenzell|st\.?\s*gallen|graubünden|grisons|aargau|argovie|thurgau|thurgovie|ticino|tessin|vaud|waadt|valais|wallis|neuchâtel|neuenburg|genève|genf|geneva|jura)\b/;
  const maritalPatterns = /\b(married|single|divorced|widowed|separated|marié|mariée|célibataire|divorcé|divorcée|veuf|veuve|séparé|séparée|verheiratet|ledig|geschieden|verwitwet|getrennt|sposato|sposata|celibe|nubile|divorziato|divorziata|vedovo|vedova)\b/;
  const childrenPatterns = /\b(\d+)\s*(child|children|kid|kids|enfant|enfants|kinder|kind|figli|figlio|figlia)\b|\b(no\s+children|sans\s+enfants?|keine\s+kinder|senza\s+figli)\b|\b([0-9])\b/;
  const agePatterns = /\b(\d{1,3})\s*(years?\s*old|ans|jahre?\s*alt|anni)\b|\bage[d:]?\s*(\d{1,3})\b|\bâgée?\s*de\s*\d{1,3}\b|\b([1-9]\d)\b/;
  const churchPatterns = /\b(church\s*member|not\s*a?\s*church\s*member|membre\s*d[e']\s*(l['']\s*)?[eé]glise|pas\s*(de\s*)?membre|kirchenmitglied|kein\s*kirchenmitglied|membro\s*della\s*chiesa|non\s*membro|catholic|catholique|katholisch|cattolico|cattolica|protestant|protestante|evangelisch|réformée?|reformiert|reformed|orthodox|orthodoxe|atheist|athée?|no\s*religion|sans\s*religion|konfessionslos|keine\s*religion|senza\s*religione|agnostic|agnostique)\b/;
  const nationalityPatterns = /\b(swiss|suisse|schweizer|svizzero|svizzera|french|français|française|german|deutsch|deutsche|italian|italiano|italiana|austrian|autrichien|autrichienne|portuguese|portugais|portugaise|spanish|espagnol|espagnole|british|american|türk|türkisch|belgian|belge|belgisch|dutch|néerlandais|néerlandaise|niederländisch|luxembourgish|luxembourgeois|luxembourgeoise|serbian|serbe|serbisch|croatian|croate|kroatisch|kosovan|kosovar|albanian|albanais|albanaise|albanisch|polish|polonais|polonaise|polnisch|romanian|roumain|roumaine|rumänisch|russian|russe|russisch|chinese|chinois|chinoise|chinesisch|indian|indien|indienne|indisch|brazilian|brésilien|brésilienne|brasilianisch|japanese|japonais|japonaise|japanisch|korean|coréen|coréenne|koreanisch|african|africain|africaine|afrikanisch|eritrean|érythréen|érythréenne|eritreisch|syrian|syrien|syrienne|syrisch|afghan|afghane|afghanisch|iraqi|irakien|irakienne|irakisch|iranian|iranien|iranienne|iranisch|nationality|nationalité|staatsangehörigkeit|nazionalità)\b/;

  const provided = {};
  provided.canton = cantonPatterns.test(text);
  provided.marital_status = maritalPatterns.test(text);
  provided.num_children = childrenPatterns.test(text);
  provided.age = agePatterns.test(text);
  provided.church_member = churchPatterns.test(text);
  provided.nationality = nationalityPatterns.test(text);

  return ESSENTIAL_FIELDS.filter(f => !provided[f]);
}

function getFieldLabel(fieldKey, lang) {
  const entry = fieldLabels[fieldKey];
  if (entry && entry[lang]) return entry[lang];
  if (entry && entry.en) return entry.en;
  return humanizeVariable(fieldKey);
}

function detectMissingFields(data) {
  if (data.missing_fields && Array.isArray(data.missing_fields)) {
    return data.missing_fields;
  }

  const missing = [];
  const skipKeys = ["missing_fields", "code_generation", "error", "status", "execution", "syllogistic_reasoning", "applicable_laws"];

  for (const [key, value] of Object.entries(data)) {
    if (skipKeys.includes(key)) continue;
    if (value === null) {
      missing.push(key);
    }
  }

  return missing;
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
        {fields.map((field, i) => (
          <li key={i}>{getFieldLabel(field, lang)}</li>
        ))}
      </ul>
      <p>{t.missingFieldsOutro}</p>
    </div>
  );
}

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
    executionFailed: data.execution && !data.execution.success && !data._suppressExecFailNote,
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
  const [messages, setMessages] = useState([]); // { type: 'user'|'answer'|'missing_fields'|'error', text?, data?, fields? }
  const [heroInput, setHeroInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState("fr");
  const [conversationHistory, setConversationHistory] = useState([]);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const processQuery = async (text) => {
    setMessages((prev) => [...prev, { type: "user", text }]);
    const newHistory = [...conversationHistory, text];
    setConversationHistory(newHistory);
    setIsLoading(true);

    const fullContext = newHistory.join("\n");
    const payload = { case_description: fullContext, execute: true, language: lang };

    try {
      const data = await callBackend(payload);
      if (data.execution && !data.execution.success) {
        const essentialMissing = inferMissingEssentialFields(data, fullContext);
        if (essentialMissing.length > 0) {
          setMessages((prev) => [
            ...prev,
            { type: "missing_fields", fields: essentialMissing },
          ]);
        } else {
          setMessages((prev) => [...prev, { type: "answer", data }]);
        }
      } else {
        const missingFields = detectMissingFields(data);
        if (missingFields.length > 0) {
          setMessages((prev) => [...prev, { type: "missing_fields", fields: missingFields }]);
        } else {
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
    setConversationHistory([]);
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
                if (msg.type === "missing_fields") {
                  return <MissingFieldsMessage key={i} fields={msg.fields} lang={lang} />;
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
