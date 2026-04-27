// ============================================================
// SHARED MODULE — used by both App.js (React) and index.html
// (vanilla). Pure data + framework-agnostic helpers.
// ============================================================

export const i18n = {
  en: {
    concretely: "In concrete terms,", chf: "CHF", perMonth: "per month",
    alsoConsidered: "I also considered some other rules that don't apply here:",
    execFailNote: "I wasn't able to compute the exact figures due to a technical issue, but the legal reasoning above still holds.",
    noLaws: "I couldn't identify any applicable Swiss federal law articles for this situation. Could you give me more details?",
    missingFieldsIntro: "To provide a complete legal analysis, I still need the following information:",
    missingFieldsOutro: "Please provide these details so I can give you a precise answer.",
    computedResults: "Computed results:", yes: "Yes", no: "No",
    legalBasis: "Legal basis", processedIn: "Processed in",
    invalidNumber: "Please enter a valid number",
    belowMin: "Must be at least {min}",
    aboveMax: "Must be at most {max}",
    loading: "Loading…",
  },
  fr: {
    concretely: "Concrètement,", chf: "CHF", perMonth: "par mois",
    alsoConsidered: "J'ai aussi examiné d'autres règles qui ne s'appliquent pas ici :",
    execFailNote: "Je n'ai pas pu calculer le montant exact en raison d'un problème technique, mais le raisonnement juridique ci-dessus reste valide.",
    noLaws: "Je n'ai pas pu identifier d'articles de droit fédéral applicables à cette situation. Pourriez-vous me donner plus de détails ?",
    missingFieldsIntro: "Pour fournir une analyse juridique complète, j'ai encore besoin des informations suivantes :",
    missingFieldsOutro: "Veuillez fournir ces détails afin que je puisse vous donner une réponse précise.",
    computedResults: "Résultats calculés :", yes: "Oui", no: "Non",
    legalBasis: "Base légale", processedIn: "Traité en",
    invalidNumber: "Veuillez saisir un nombre valide",
    belowMin: "Doit être au moins {min}",
    aboveMax: "Doit être au plus {max}",
    loading: "Chargement…",
  },
  de: {
    concretely: "Konkret,", chf: "CHF", perMonth: "pro Monat",
    alsoConsidered: "Ich habe auch andere Regeln geprüft, die hier nicht gelten:",
    execFailNote: "Ich konnte den genauen Betrag aufgrund eines technischen Problems nicht berechnen, aber die rechtliche Argumentation bleibt gültig.",
    noLaws: "Für diese Situation konnten keine anwendbaren Artikel des Bundesrechts identifiziert werden. Könnten Sie mir weitere Details geben?",
    missingFieldsIntro: "Um eine vollständige rechtliche Analyse zu erstellen, benötige ich noch folgende Informationen:",
    missingFieldsOutro: "Bitte geben Sie diese Details an, damit ich Ihnen eine genaue Antwort geben kann.",
    computedResults: "Berechnete Ergebnisse:", yes: "Ja", no: "Nein",
    legalBasis: "Rechtsgrundlage", processedIn: "Verarbeitet in",
    invalidNumber: "Bitte geben Sie eine gültige Zahl ein",
    belowMin: "Muss mindestens {min} sein",
    aboveMax: "Darf höchstens {max} sein",
    loading: "Wird geladen…",
  },
  it: {
    concretely: "Concretamente,", chf: "CHF", perMonth: "al mese",
    alsoConsidered: "Ho anche considerato altre regole che non si applicano in questo caso:",
    execFailNote: "Non sono riuscito a calcolare l'importo esatto a causa di un problema tecnico, ma il ragionamento giuridico sopra resta valido.",
    noLaws: "Non sono riuscito a identificare articoli di diritto federale applicabili a questa situazione. Potrebbe fornirmi maggiori dettagli?",
    missingFieldsIntro: "Per fornire un'analisi giuridica completa, ho ancora bisogno delle seguenti informazioni:",
    missingFieldsOutro: "Vi prego di fornire questi dettagli affinché possa darvi una risposta precisa.",
    computedResults: "Risultati calcolati:", yes: "Sì", no: "No",
    legalBasis: "Base giuridica", processedIn: "Elaborato in",
    invalidNumber: "Inserire un numero valido",
    belowMin: "Deve essere almeno {min}",
    aboveMax: "Deve essere al massimo {max}",
    loading: "Caricamento…",
  },
};

export const SUGGESTIONS = [
  "Anna works in Zurich earning 85000 CHF/year as an employee",
  "My neighbor's tree fell on my car during a storm, who is liable for the damage?",
  "I'm a 20-year-old student living in Bern, can I get a scholarship for my university studies?",
];

export const fieldLabels = {
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
};

export const fieldMeta = {
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
      fr: [["male","Masculin"],["female","Féminin"],["other","Autre"]],
      de: [["male","Männlich"],["female","Weiblich"],["other","Andere"]],
      it: [["male","Maschile"],["female","Femminile"],["other","Altro"]],
    },
  },
  marital_status: {
    type: "select",
    options: {
      en: [["single","Single"],["married","Married"],["divorced","Divorced"],["widowed","Widowed"],["separated","Separated"]],
      fr: [["single","Célibataire"],["married","Marié(e)"],["divorced","Divorcé(e)"],["widowed","Veuf/Veuve"],["separated","Séparé(e)"]],
      de: [["single","Ledig"],["married","Verheiratet"],["divorced","Geschieden"],["widowed","Verwitwet"],["separated","Getrennt"]],
      it: [["single","Celibe/Nubile"],["married","Sposato/a"],["divorced","Divorziato/a"],["widowed","Vedovo/a"],["separated","Separato/a"]],
    },
  },
  employment_status: {
    type: "select",
    options: {
      en: [["employed","Employed"],["self_employed","Self-employed"],["unemployed","Unemployed"],["student","Student"],["retired","Retired"]],
      fr: [["employed","Employé(e)"],["self_employed","Indépendant(e)"],["unemployed","Sans emploi"],["student","Étudiant(e)"],["retired","Retraité(e)"]],
      de: [["employed","Angestellt"],["self_employed","Selbstständig"],["unemployed","Arbeitslos"],["student","Student(in)"],["retired","Pensioniert"]],
      it: [["employed","Impiegato/a"],["self_employed","Indipendente"],["unemployed","Disoccupato/a"],["student","Studente/ssa"],["retired","Pensionato/a"]],
    },
  },
  residence_permit: {
    type: "select",
    options: {
      en: [["C","C — Settlement"],["B","B — Residence"],["L","L — Short-term"],["G","G — Cross-border"],["F","F — Provisional"],["N","N — Asylum seeker"],["swiss","Swiss citizen"]],
      fr: [["C","C — Établissement"],["B","B — Séjour"],["L","L — Courte durée"],["G","G — Frontalier"],["F","F — Admission provisoire"],["N","N — Requérant d'asile"],["swiss","Citoyen(ne) suisse"]],
      de: [["C","C — Niederlassung"],["B","B — Aufenthalt"],["L","L — Kurzaufenthalt"],["G","G — Grenzgänger"],["F","F — Vorläufige Aufnahme"],["N","N — Asylsuchende"],["swiss","Schweizer Bürger(in)"]],
      it: [["C","C — Domicilio"],["B","B — Dimora"],["L","L — Breve durata"],["G","G — Frontaliere"],["F","F — Ammissione provvisoria"],["N","N — Richiedente asilo"],["swiss","Cittadino/a svizzero/a"]],
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

export const SWISS_CANTONS = [
  "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR",
  "JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG",
  "TI","UR","VD","VS","ZG","ZH",
];

export function parseSyllogism(text) {
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

export function humanizeVariable(v) {
  return v.replace(/_/g, " ").replace(/\bahv\b/gi, "AHV");
}

export function articleMatchesApplicable(blockArticle, applicableLaws) {
  return applicableLaws.some((l) => blockArticle.startsWith(l));
}

export function stripTrailingPeriod(s) {
  return s ? s.replace(/[.\s]+$/, "") : s;
}

export function getFieldLabel(fieldKey, lang) {
  const entry = fieldLabels[fieldKey];
  if (entry && entry[lang]) return entry[lang];
  if (entry && entry.en) return entry.en;
  return humanizeVariable(fieldKey);
}

export function getSubmitLabel(lang) {
  return { en: "Submit", fr: "Envoyer", de: "Absenden", it: "Invia" }[lang] || "Submit";
}

export function resolveFieldMeta(field) {
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

// Returns null if the raw input is valid (or empty — empty fields are
// treated as "skip"). Returns a translated error message otherwise.
// Currently only number fields have constraints worth surfacing; selects
// and text fields can't fail validation in the form UI.
export function validateField(field, raw, lang) {
  if (raw == null || String(raw).trim() === "") return null;
  const meta = resolveFieldMeta(field);
  const t = i18n[lang] || i18n.en;
  if (meta.type === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return t.invalidNumber;
    if (meta.min != null && n < meta.min) return t.belowMin.replace("{min}", meta.min);
    if (meta.max != null && n > meta.max) return t.aboveMax.replace("{max}", meta.max);
  }
  return null;
}

export function formatComputedValue(value, variable, t) {
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

export function composeNaturalReply({ syllogism, applicableLaws, articleToComputed, executionFailed, t }) {
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
