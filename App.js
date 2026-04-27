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
// I18N
// ============================================================
const i18n = {
  en: {
    concretely: "In concrete terms,", chf: "CHF", perMonth: "per month",
    alsoConsidered: "I also considered some other rules that don't apply here:",
    execFailNote: "I wasn't able to compute the exact figures due to a technical issue, but the legal reasoning above still holds.",
    noLaws: "I couldn't identify any applicable Swiss federal law articles for this situation. Could you give me more details?",
    missingFieldsIntro: "To provide a complete legal analysis, I still need the following information:",
    missingFieldsOutro: "Please provide these details so I can give you a precise answer.",
    computedResults: "Computed results:", yes: "Yes", no: "No",
    legalBasis: "Legal basis", processedIn: "Processed in",
  },
  fr: {
    concretely: "Concr\u00e8tement,", chf: "CHF", perMonth: "par mois",
    alsoConsidered: "J'ai aussi examin\u00e9 d'autres r\u00e8gles qui ne s'appliquent pas ici :",
    execFailNote: "Je n'ai pas pu calculer le montant exact en raison d'un probl\u00e8me technique, mais le raisonnement juridique ci-dessus reste valide.",
    noLaws: "Je n'ai pas pu identifier d'articles de droit f\u00e9d\u00e9ral applicables \u00e0 cette situation. Pourriez-vous me donner plus de d\u00e9tails ?",
    missingFieldsIntro: "Pour fournir une analyse juridique compl\u00e8te, j'ai encore besoin des informations suivantes :",
    missingFieldsOutro: "Veuillez fournir ces d\u00e9tails afin que je puisse vous donner une r\u00e9ponse pr\u00e9cise.",
    computedResults: "R\u00e9sultats calcul\u00e9s :", yes: "Oui", no: "Non",
    legalBasis: "Base l\u00e9gale", processedIn: "Trait\u00e9 en",
  },
  de: {
    concretely: "Konkret,", chf: "CHF", perMonth: "pro Monat",
    alsoConsidered: "Ich habe auch andere Regeln gepr\u00fcft, die hier nicht gelten:",
    execFailNote: "Ich konnte den genauen Betrag aufgrund eines technischen Problems nicht berechnen, aber die rechtliche Argumentation bleibt g\u00fcltig.",
    noLaws: "F\u00fcr diese Situation konnten keine anwendbaren Artikel des Bundesrechts identifiziert werden. K\u00f6nnten Sie mir weitere Details geben?",
    missingFieldsIntro: "Um eine vollst\u00e4ndige rechtliche Analyse zu erstellen, ben\u00f6tige ich noch folgende Informationen:",
    missingFieldsOutro: "Bitte geben Sie diese Details an, damit ich Ihnen eine genaue Antwort geben kann.",
    computedResults: "Berechnete Ergebnisse:", yes: "Ja", no: "Nein",
    legalBasis: "Rechtsgrundlage", processedIn: "Verarbeitet in",
  },
  it: {
    concretely: "Concretamente,", chf: "CHF", perMonth: "al mese",
    alsoConsidered: "Ho anche considerato altre regole che non si applicano in questo caso:",
    execFailNote: "Non sono riuscito a calcolare l'importo esatto a causa di un problema tecnico, ma il ragionamento giuridico sopra resta valido.",
    noLaws: "Non sono riuscito a identificare articoli di diritto federale applicabili a questa situazione. Potrebbe fornirmi maggiori dettagli?",
    missingFieldsIntro: "Per fornire un'analisi giuridica completa, ho ancora bisogno delle seguenti informazioni:",
    missingFieldsOutro: "Vi prego di fornire questi dettagli affinch\u00e9 possa darvi una risposta precisa.",
    computedResults: "Risultati calcolati:", yes: "S\u00ec", no: "No",
    legalBasis: "Base giuridica", processedIn: "Elaborato in",
  },
};

// ============================================================
// SYLLOGISM PARSER
// ============================================================
function parseSyllogism(text) {
  if (!text) return [];

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
          if (currentType && buffer.length) premises.push({ type: currentType, text: buffer.join(" ").trim() });
          buffer = [];
        };
        lines.forEach((line) => {
          const m = line.match(/^\s*(Major\s*Premise|Minor\s*Premise|Conclusion)\s*:\s*(.*)/i);
          if (m) {
            flush();
            currentType = m[1].toLowerCase().includes("major") ? "major" : m[1].toLowerCase().includes("minor") ? "minor" : "conclusion";
            if (m[2]) buffer.push(m[2]);
          } else if (currentType) buffer.push(line);
        });
        flush();
        const major = premises.find((p) => p.type === "major");
        const articleMatch = major ? major.text.match(/art\.\s*(\d+[a-z]?)\s*([A-Z]{2,5})/i) : null;
        const article = articleMatch ? `${articleMatch[2].toUpperCase()} Art. ${articleMatch[1]}` : "";
        return { article, premises };
      });
  }

  return text
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const headerMatch = block.match(/\*\*([^*]+)\*\*/);
      const article = headerMatch ? headerMatch[1].trim() : "";
      const premises = block.split("\n").slice(1).map((line) => {
        const m = line.match(/-\s*(Major premise|Minor premise|Conclusion)\s*:\s*(.+)/i);
        if (!m) return null;
        const type = m[1].toLowerCase().includes("major") ? "major" : m[1].toLowerCase().includes("minor") ? "minor" : "conclusion";
        return { type, text: m[2].trim() };
      }).filter(Boolean);
      return { article, premises };
    });
}

// ============================================================
// HELPERS
// ============================================================
function humanizeVariable(v) {
  return v.replace(/_/g, " ").replace(/\bahv\b/gi, "AHV");
}

function articleMatchesApplicable(blockArticle, applicableLaws) {
  return applicableLaws.some((l) => blockArticle.startsWith(l));
}

const SUGGESTIONS = [
  "Anna works in Zurich earning 85000 CHF/year as an employee",
  "My neighbor's tree fell on my car during a storm, who is liable for the damage?",
  "I'm a 20-year-old student living in Bern, can I get a scholarship for my university studies?",
];

// ============================================================
// FIELD LABELS
// ============================================================
const fieldLabels = {
  income: { en: "Income", fr: "Revenu", de: "Einkommen", it: "Reddito" },
  canton: { en: "Canton of residence", fr: "Canton de r\u00e9sidence", de: "Wohnkanton", it: "Cantone di residenza" },
  employment_status: { en: "Employment status", fr: "Statut d'emploi", de: "Besch\u00e4ftigungsstatus", it: "Stato occupazionale" },
  age: { en: "Age", fr: "\u00c2ge", de: "Alter", it: "Et\u00e0" },
  nationality: { en: "Nationality", fr: "Nationalit\u00e9", de: "Staatsangeh\u00f6rigkeit", it: "Nazionalit\u00e0" },
  marital_status: { en: "Marital status", fr: "\u00c9tat civil", de: "Zivilstand", it: "Stato civile" },
  num_children: { en: "Number of children", fr: "Nombre d'enfants", de: "Anzahl Kinder", it: "Numero di figli" },
  residence_permit: { en: "Residence permit type", fr: "Type de permis de s\u00e9jour", de: "Aufenthaltsbewilligung", it: "Tipo di permesso di soggiorno" },
  years_in_switzerland: { en: "Years in Switzerland", fr: "Ann\u00e9es en Suisse", de: "Jahre in der Schweiz", it: "Anni in Svizzera" },
  employer_type: { en: "Employer type", fr: "Type d'employeur", de: "Arbeitgebertyp", it: "Tipo di datore di lavoro" },
  weekly_hours: { en: "Weekly working hours", fr: "Heures de travail hebdomadaires", de: "W\u00f6chentliche Arbeitsstunden", it: "Ore di lavoro settimanali" },
  church_member: { en: "Church membership", fr: "Appartenance \u00e0 une \u00e9glise", de: "Kirchenmitgliedschaft", it: "Appartenenza a una chiesa" },
  salary: { en: "Salary", fr: "Salaire", de: "Gehalt", it: "Stipendio" },
  tax_class: { en: "Tax class", fr: "Classe d'imp\u00f4t", de: "Steuerklasse", it: "Classe fiscale" },
  work_canton: { en: "Canton of employment", fr: "Canton d'emploi", de: "Arbeitskanton", it: "Cantone di lavoro" },
  occupation: { en: "Occupation", fr: "Profession", de: "Beruf", it: "Professione" },
  self_employed: { en: "Self-employed status", fr: "Statut ind\u00e9pendant", de: "Selbstst\u00e4ndigkeitsstatus", it: "Stato di lavoratore autonomo" },
  birth_date: { en: "Date of birth", fr: "Date de naissance", de: "Geburtsdatum", it: "Data di nascita" },
  gender: { en: "Gender", fr: "Genre", de: "Geschlecht", it: "Geschlecht" },
};

function getFieldLabel(fieldKey, lang) {
  const entry = fieldLabels[fieldKey];
  if (entry && entry[lang]) return entry[lang];
  if (entry && entry.en) return entry.en;
  return humanizeVariable(fieldKey);
}

// ============================================================
// FIELD META — input type + constraints for form rendering
// ============================================================
const fieldMeta = {
  income:       { type: "number", min: 0, max: 10000000, step: 1000 },
  age:          { type: "number", min: 0, max: 150, step: 1 },
  num_children: { type: "number", min: 0, max: 30, step: 1 },
  years_in_switzerland: { type: "number", min: 0, max: 150, step: 1 },
  weekly_hours: { type: "number", min: 0, max: 168, step: 0.5 },
  salary:       { type: "number", min: 0, max: 10000000, step: 100 },
  church_member: { type: "boolean" },
  self_employed: { type: "boolean" },
  canton:       { type: "canton" },
  work_canton:  { type: "canton" },
  gender: {
    type: "select",
    options: {
      en: [["male","Male"],["female","Female"],["other","Other"]],
      fr: [["male","Masculin"],["female","F\u00e9minin"],["other","Autre"]],
      de: [["male","M\u00e4nnlich"],["female","Weiblich"],["other","Andere"]],
      it: [["male","Maschile"],["female","Femminile"],["other","Altro"]],
    },
  },
  marital_status: {
    type: "select",
    options: {
      en: [["single","Single"],["married","Married"],["divorced","Divorced"],["widowed","Widowed"],["separated","Separated"]],
      fr: [["single","C\u00e9libataire"],["married","Mari\u00e9(e)"],["divorced","Divorc\u00e9(e)"],["widowed","Veuf/Veuve"],["separated","S\u00e9par\u00e9(e)"]],
      de: [["single","Ledig"],["married","Verheiratet"],["divorced","Geschieden"],["widowed","Verwitwet"],["separated","Getrennt"]],
      it: [["single","Celibe/Nubile"],["married","Sposato/a"],["divorced","Divorziato/a"],["widowed","Vedovo/a"],["separated","Separato/a"]],
    },
  },
  employment_status: {
    type: "select",
    options: {
      en: [["employed","Employed"],["self_employed","Self-employed"],["unemployed","Unemployed"],["student","Student"],["retired","Retired"]],
      fr: [["employed","Employ\u00e9(e)"],["self_employed","Ind\u00e9pendant(e)"],["unemployed","Sans emploi"],["student","\u00c9tudiant(e)"],["retired","Retrait\u00e9(e)"]],
      de: [["employed","Angestellt"],["self_employed","Selbstst\u00e4ndig"],["unemployed","Arbeitslos"],["student","Student(in)"],["retired","Pensioniert"]],
      it: [["employed","Impiegato/a"],["self_employed","Indipendente"],["unemployed","Disoccupato/a"],["student","Studente/ssa"],["retired","Pensionato/a"]],
    },
  },
  residence_permit: {
    type: "select",
    options: {
      en: [["C","C \u2014 Settlement"],["B","B \u2014 Residence"],["L","L \u2014 Short-term"],["G","G \u2014 Cross-border"],["F","F \u2014 Provisional"],["N","N \u2014 Asylum seeker"],["swiss","Swiss citizen"]],
      fr: [["C","C \u2014 \u00c9tablissement"],["B","B \u2014 S\u00e9jour"],["L","L \u2014 Courte dur\u00e9e"],["G","G \u2014 Frontalier"],["F","F \u2014 Admission provisoire"],["N","N \u2014 Requ\u00e9rant d'asile"],["swiss","Citoyen(ne) suisse"]],
      de: [["C","C \u2014 Niederlassung"],["B","B \u2014 Aufenthalt"],["L","L \u2014 Kurzaufenthalt"],["G","G \u2014 Grenzg\u00e4nger"],["F","F \u2014 Vorl\u00e4ufige Aufnahme"],["N","N \u2014 Asylsuchende"],["swiss","Schweizer B\u00fcrger(in)"]],
      it: [["C","C \u2014 Domicilio"],["B","B \u2014 Dimora"],["L","L \u2014 Breve durata"],["G","G \u2014 Frontaliere"],["F","F \u2014 Ammissione provvisoria"],["N","N \u2014 Richiedente asilo"],["swiss","Cittadino/a svizzero/a"]],
    },
  },
  tax_class: {
    type: "select",
    options: {
      en: [["A","A"],["B","B"],["C","C"],["D","D"],["H","H"]],
      fr: [["A","A"],["B","B"],["C","C"],["D","D"],["H","H"]],
      de: [["A","A"],["B","B"],["C","C"],["D","D"],["H","H"]],
      it: [["A","A"],["B","B"],["C","C"],["D","D"],["H","H"]],
    },
  },
};

const SWISS_CANTONS = [
  "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR",
  "JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG",
  "TI","UR","VD","VS","ZG","ZH",
];

function getSubmitLabel(lang) {
  return { en: "Submit", fr: "Envoyer", de: "Absenden", it: "Invia" }[lang] || "Submit";
}

function resolveFieldMeta(field) {
  const id = typeof field === "object" ? field.id : field;
  if (fieldMeta[id]) return { id, ...fieldMeta[id] };
  const backendType = typeof field === "object" ? field.type : null;
  const allowed = typeof field === "object" ? field.allowed_values : null;
  if (backendType === "bool") return { id, type: "boolean" };
  if (allowed && allowed.length > 0) return { id, type: "enum", allowed };
  if (backendType === "int") return { id, type: "number", min: 0, step: 1 };
  if (backendType === "float") return { id, type: "number", step: "any" };
  return { id, type: "text" };
}

// ============================================================
// FIELD INPUT COMPONENT
// ============================================================
function FieldInput({ field, value, onChange, lang }) {
  const meta = resolveFieldMeta(field);
  const t = i18n[lang] || i18n.en;

  if (meta.type === "boolean") {
    return (
      <select className="field-input" value={value} onChange={(e) => onChange(meta.id, e.target.value)}>
        <option value="">--</option>
        <option value="true">{t.yes}</option>
        <option value="false">{t.no}</option>
      </select>
    );
  }
  if (meta.type === "canton") {
    return (
      <select className="field-input" value={value} onChange={(e) => onChange(meta.id, e.target.value)}>
        <option value="">--</option>
        {SWISS_CANTONS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    );
  }
  if (meta.type === "select") {
    const pairs = (meta.options && meta.options[lang]) || (meta.options && meta.options.en) || [];
    return (
      <select className="field-input" value={value} onChange={(e) => onChange(meta.id, e.target.value)}>
        <option value="">--</option>
        {pairs.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
      </select>
    );
  }
  if (meta.type === "enum") {
    return (
      <select className="field-input" value={value} onChange={(e) => onChange(meta.id, e.target.value)}>
        <option value="">--</option>
        {meta.allowed.map((v) => <option key={v} value={String(v)}>{String(v)}</option>)}
      </select>
    );
  }
  if (meta.type === "number") {
    return (
      <input
        className="field-input"
        type="number"
        min={meta.min}
        max={meta.max}
        step={meta.step || "any"}
        value={value}
        onChange={(e) => onChange(meta.id, e.target.value)}
      />
    );
  }
  return (
    <input
      className="field-input"
      type="text"
      value={value}
      onChange={(e) => onChange(meta.id, e.target.value)}
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

  const handleChange = (id, val) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = {};
    let anyFilled = false;
    fields.forEach((field) => {
      const meta = resolveFieldMeta(field);
      const raw = values[meta.id]?.trim();
      if (!raw) return;
      anyFilled = true;
      if (meta.type === "boolean") parsed[meta.id] = raw === "true";
      else if (meta.type === "number") parsed[meta.id] = Number(raw);
      else parsed[meta.id] = raw;
    });
    if (anyFilled) onSubmit(parsed);
  };

  return (
    <div className="msg bot">
      <p>{t.missingFieldsIntro}</p>
      <form className="missing-fields-form" onSubmit={handleSubmit}>
        <div className="missing-fields-grid">
          {fields.map((field, i) => {
            const id = typeof field === "object" ? field.id : field;
            const label = typeof field === "object"
              ? (field.description || getFieldLabel(field.id, lang))
              : getFieldLabel(field, lang);
            const lawRef = typeof field === "object" ? field.law_reference : null;
            return (
              <div className="field-group" key={i}>
                <label className="field-label">
                  {label}
                  {lawRef && <span className="law-ref">({lawRef})</span>}
                </label>
                <FieldInput field={field} value={values[id]} onChange={handleChange} lang={lang} />
              </div>
            );
          })}
        </div>
        <div className="missing-fields-submit">
          <button type="submit" disabled={disabled}>{getSubmitLabel(lang)}</button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// LEGAL ANSWER
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

function composeNaturalReply({ syllogism, applicableLaws, articleToComputed, executionFailed, t }) {
  const applicableBlocks = syllogism.filter((s) => s.article && applicableLaws.some((l) => s.article.startsWith(l)));
  const excludedBlocks = syllogism.filter((s) => s.article && !applicableLaws.some((l) => s.article.startsWith(l)));
  const paragraphs = [];
  const sentences = [];
  applicableBlocks.forEach((block, i) => {
    const minor = block.premises.find((p) => p.type === "minor");
    const conclusion = block.premises.find((p) => p.type === "conclusion");
    const articleRef = applicableLaws.find((l) => block.article.startsWith(l)) || block.article;
    const computed = articleToComputed[articleRef];
    if (i === 0 && minor) sentences.push(stripTrailingPeriod(minor.text) + ".");
    if (conclusion) {
      let s = stripTrailingPeriod(conclusion.text);
      if (computed && typeof computed.value === "number" && computed.variable.includes("contribution")) {
        const amount = computed.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
        s += ` ${t.concretely.toLowerCase()} ${amount} ${t.chf} ${t.perMonth}`;
      }
      sentences.push(s + ".");
    }
  });
  if (sentences.length) paragraphs.push(sentences.join(" "));
  if (excludedBlocks.length) {
    const es = excludedBlocks.map((b) => { const c = b.premises.find((p) => p.type === "conclusion"); return c ? stripTrailingPeriod(c.text) + "." : null; }).filter(Boolean);
    if (es.length) paragraphs.push(`${t.alsoConsidered} ${es.join(" ")}`);
  }
  if (executionFailed) paragraphs.push(t.execFailNote);
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
            <div className="title">CLAWDE.IA</div>
            <div className="sub"></div>
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
          <section className="chat-view">
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

            <div className="chat-box" ref={chatBoxRef}>
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
                if (msg.type === "error") return <div key={i} className="exec-error">{msg.text}</div>;
                return null;
              })}
              {isLoading && <div className="typing"><span></span><span></span><span></span></div>}
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
