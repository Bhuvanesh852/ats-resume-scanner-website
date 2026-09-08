// app.js — ATS Resume Intelligence
// Everything runs locally in the browser. No resume text is uploaded
// to any server; parsing and scoring happen entirely client-side.

const state = {
  resumeText: "",
  fileName: "",
  jobText: "",
  role: null,
  analysis: null,
};

// ---------- DOM shortcuts ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---------- File handling ----------
const dropZone = $("#dropZone");
const fileInput = $("#fileInput");
const fileMeta = $("#fileMeta");
const pasteArea = $("#pasteArea");
const jobArea = $("#jobArea");
const roleSelect = $("#roleSelect");
const scanBtn = $("#scanBtn");
const sampleBtn = $("#sampleBtn");

["dragenter", "dragover"].forEach(evt =>
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add("is-drag"); })
);
["dragleave", "drop"].forEach(evt =>
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove("is-drag"); })
);
dropZone.addEventListener("drop", (e) => {
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});
dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) handleFile(f);
});

async function handleFile(file) {
  const okTypes = [".txt", ".pdf", ".docx"];
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!okTypes.includes(ext)) {
    setFileMeta(`Unsupported file type (${ext}). Please upload .txt, .pdf, or .docx.`, true);
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    setFileMeta("File is too large (max 8MB).", true);
    return;
  }
  setFileMeta(`Reading ${file.name} (${formatSize(file.size)})…`, false);
  try {
    let text = "";
    if (ext === ".txt") {
      text = await file.text();
    } else if (ext === ".pdf") {
      text = await extractPdfText(file);
    } else if (ext === ".docx") {
      text = await extractDocxText(file);
    }
    text = (text || "").trim();
    if (!text || text.length < 40) {
      setFileMeta("Couldn't extract readable text from this file. It may be scanned/image-based — try pasting the text instead.", true);
      return;
    }
    state.resumeText = text;
    state.fileName = file.name;
    pasteArea.value = "";
    setFileMeta(`Loaded ${file.name} (${formatSize(file.size)}) — ${text.split(/\s+/).length} words extracted.`, false);
  } catch (err) {
    console.error(err);
    setFileMeta("Something went wrong reading that file. Try pasting the resume text instead.", true);
  }
}

function setFileMeta(msg, isError) {
  fileMeta.textContent = msg;
  fileMeta.classList.toggle("is-error", !!isError);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str).join(" ") + "\n";
  }
  return text;
}

async function extractDocxText(file) {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

pasteArea.addEventListener("input", () => {
  if (pasteArea.value.trim().length > 0) {
    state.resumeText = pasteArea.value;
    state.fileName = "Pasted text";
  }
});

jobArea.addEventListener("input", () => { state.jobText = jobArea.value; });
roleSelect.addEventListener("change", () => { state.role = roleSelect.value || null; });

// populate role select
ROLE_LIBRARY && Object.keys(ROLE_LIBRARY).forEach(role => {
  const opt = document.createElement("option");
  opt.value = role;
  opt.textContent = role;
  roleSelect.appendChild(opt);
});

sampleBtn.addEventListener("click", () => {
  pasteArea.value = SAMPLE_RESUME;
  state.resumeText = SAMPLE_RESUME;
  state.fileName = "Sample resume";
  setFileMeta("Loaded the sample resume.", false);
});

scanBtn.addEventListener("click", () => {
  const text = (pasteArea.value.trim() || state.resumeText || "").trim();
  if (!text || text.length < 40) {
    setFileMeta("Please upload a resume, or paste resume text, before scanning.", true);
    pasteArea.focus();
    return;
  }
  state.resumeText = text;
  state.jobText = jobArea.value.trim();
  state.role = roleSelect.value || null;
  runAnalysis();
});

// ---------- Analysis engine ----------
function runAnalysis() {
  const text = state.resumeText;
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  const sections = detectSections(lower);
  const contact = analyzeContact(text);
  const summary = analyzeSummary(text, sections);
  const experience = analyzeExperience(text, sections);
  const skillsFound = detectSkills(lower);
  const eduProjCert = analyzeEduProjCert(sections, skillsFound);
  const writing = analyzeWriting(text, words, lines);
  const jobMatch = state.jobText ? matchJobDescription(lower, state.jobText) : null;
  const roleGap = state.role ? roleKeywordGap(lower, state.role) : null;
  const parsability = analyzeParsability(text, lines);

  const scores = {
    parsability: parsability.score,          // /20
    contact: contact.score,                  // /10
    summary: summary.score,                  // /10
    experience: experience.score,            // /20
    skills: computeSkillsScore(skillsFound, jobMatch, roleGap), // /15
    eduProjCert: eduProjCert.score,          // /10
    writing: writing.score,                  // /5
    hiringReadiness: 0,                      // /10, computed below
  };

  const completeness = [sections.summary, sections.experience, sections.skills,
    sections.education, sections.projects].filter(Boolean).length / 5;
  const quantRatio = experience.quantifiedRatio || 0;
  const matchFactor = jobMatch ? jobMatch.overallPercent / 100 : 0.6;
  scores.hiringReadiness = Math.round(
    (completeness * 4) + (quantRatio * 3) + (matchFactor * 3)
  );
  scores.hiringReadiness = Math.min(10, scores.hiringReadiness);

  const total = Math.round(
    scores.parsability + scores.contact + scores.summary + scores.experience +
    scores.skills + scores.eduProjCert + scores.writing + scores.hiringReadiness
  );

  const analysis = {
    total: Math.max(0, Math.min(100, total)),
    scores,
    sections, contact, summary, experience, skillsFound, eduProjCert,
    writing, jobMatch, roleGap, parsability,
    actionPlan: buildActionPlan({ scores, contact, summary, experience, jobMatch, roleGap, parsability, writing }),
  };

  state.analysis = analysis;
  renderResults(analysis);
  chatSystemNote(analysis);
}

function detectSections(lower) {
  const has = (re) => re.test(lower);
  return {
    summary: has(/\b(summary|objective|profile)\b/),
    experience: has(/\b(experience|employment|work history)\b/),
    education: has(/\beducation\b/),
    skills: has(/\bskills\b/),
    projects: has(/\bprojects?\b/),
    certifications: has(/\b(certifications?|licenses?)\b/),
  };
}

function analyzeContact(text) {
  const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const phone = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(text);
  const linkedin = /linkedin\.com/i.test(text);
  const github = /github\.com/i.test(text);
  const website = /(portfolio|https?:\/\/)/i.test(text) && !/linkedin\.com|github\.com/i.test(text);
  const found = { email, phone, linkedin, github, website };
  const count = Object.values(found).filter(Boolean).length;
  // out of 10: email+phone are core (3 pts each), the rest share the remaining 4
  let score = 0;
  if (email) score += 3;
  if (phone) score += 3;
  if (linkedin) score += 1.5;
  if (github) score += 1.5;
  if (website) score += 1;
  return { found, score: Math.min(10, Math.round(score)) };
}

function analyzeSummary(text, sections) {
  if (!sections.summary) return { present: false, score: 2, wordCount: 0, genericHits: [] };
  const match = text.match(/(summary|objective|profile)[:\s]*([\s\S]{0,600}?)(\n\s*\n|\n[A-Z][A-Za-z ]{2,20}\n|$)/i);
  const body = match ? match[2] : "";
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const genericPhrases = ["hardworking", "team player", "detail-oriented", "results-driven",
    "go-getter", "self-starter", "think outside the box", "synergy"];
  const genericHits = genericPhrases.filter(p => body.toLowerCase().includes(p));
  let score = 5;
  if (wordCount >= 25 && wordCount <= 120) score += 3; else score += 1;
  score -= genericHits.length;
  score = Math.max(2, Math.min(10, score));
  return { present: true, score, wordCount, genericHits, body: body.trim() };
}

function analyzeExperience(text, sections) {
  if (!sections.experience) return { present: false, score: 4, bulletCount: 0, quantifiedRatio: 0, weakPhraseHits: [] };
  const bullets = text.split(/\n/).filter(l => /^[\s]*[•\-\*▪●]/.test(l) || /^[\s]*\d+[\.\)]/.test(l));
  const bulletCount = bullets.length || Math.max(1, Math.round(text.split(/\n/).length * 0.15));
  const sample = bullets.length ? bullets : text.split(/\n/).filter(l => l.trim().length > 30);
  const quantRe = /(\d+%|\$\d|\b\d{2,}\b|\d+x\b|\bmillion\b|\bthousand\b|\busers\b|\bcustomers\b)/i;
  const quantified = sample.filter(b => quantRe.test(b)).length;
  const quantifiedRatio = sample.length ? quantified / sample.length : 0;

  const strongVerbHits = sample.filter(b => STRONG_ACTION_VERBS.some(v =>
    new RegExp("^[\\s•\\-\\*▪●\\d\\.\\)]*" + v, "i").test(b))).length;
  const strongVerbRatio = sample.length ? strongVerbHits / sample.length : 0;

  const weakPhraseHits = GENERIC_WEAK_PHRASES.filter(p => text.toLowerCase().includes(p));

  let score = 8;
  score += Math.round(quantifiedRatio * 6);
  score += Math.round(strongVerbRatio * 5);
  score -= Math.min(4, weakPhraseHits.length);
  score = Math.max(4, Math.min(20, score));

  return { present: true, score, bulletCount: sample.length, quantifiedRatio, strongVerbRatio, weakPhraseHits };
}

function detectSkills(lower) {
  const allSkills = new Set();
  Object.values(ROLE_LIBRARY).forEach(r => r.keywords.forEach(k => allSkills.add(k)));
  const found = [];
  allSkills.forEach(skill => {
    const re = new RegExp("\\b" + skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(lower)) found.push(skill);
  });
  return found;
}

function computeSkillsScore(skillsFound, jobMatch, roleGap) {
  let base = Math.min(10, skillsFound.length); // up to 10 pts for breadth
  let bonus = 0;
  if (jobMatch) bonus = Math.round((jobMatch.requiredMatchPercent / 100) * 5);
  else if (roleGap) bonus = Math.round((roleGap.matchPercent / 100) * 5);
  else bonus = 3;
  return Math.min(15, base + bonus);
}

function analyzeEduProjCert(sections, skillsFound) {
  let score = 0;
  if (sections.education) score += 4;
  if (sections.projects) score += 4;
  if (sections.certifications) score += 2;
  return { score: Math.min(10, score), hasEducation: sections.education, hasProjects: sections.projects, hasCertifications: sections.certifications };
}

function analyzeWriting(text, words, lines) {
  let score = 5;
  const iCount = (text.match(/\bI\b/g) || []).length;
  if (iCount > 5) score -= 1;
  const longLines = lines.filter(l => l.split(/\s+/).length > 40).length;
  if (longLines > 2) score -= 1;
  const doubleSpaces = (text.match(/  +/g) || []).length;
  if (doubleSpaces > 10) score -= 0.5;
  score = Math.max(2, Math.min(5, Math.round(score)));
  return { score, firstPersonHits: iCount, longLines };
}

function analyzeParsability(text, lines) {
  let score = 20;
  const tabCount = (text.match(/\t/g) || []).length;
  if (tabCount > 15) score -= 3;
  const oddChars = (text.match(/[^\x00-\x7F]/g) || []).length;
  if (oddChars > 30) score -= 2;
  const veryShortLines = lines.filter(l => l.length > 0 && l.length < 3).length;
  if (veryShortLines > 20) score -= 3; // possible multi-column extraction artifacts
  const headingsFound = ["experience", "education", "skills", "summary", "projects"]
    .filter(h => new RegExp(h, "i").test(text)).length;
  if (headingsFound < 2) score -= 5;
  score = Math.max(6, Math.min(20, score));
  const risk = score >= 17 ? "Low" : score >= 12 ? "Medium" : "High";
  return { score, risk, headingsFound };
}

function tokenize(str) {
  return (str.toLowerCase().match(/[a-z][a-z+.#-]{1,}/g) || [])
    .map(w => w.replace(/^[.\-]+|[.\-]+$/g, "")) // strip stray leading/trailing punctuation
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function matchJobDescription(resumeLower, jobText) {
  const jobLower = jobText.toLowerCase();
  const jobTokens = tokenize(jobLower);
  const freq = {};
  jobTokens.forEach(t => freq[t] = (freq[t] || 0) + 1);
  const uniqueTerms = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 40);

  const matched = [];
  const missing = [];
  uniqueTerms.forEach(term => {
    const re = new RegExp("\\b" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    if (re.test(resumeLower)) matched.push(term); else missing.push(term);
  });

  const overallPercent = uniqueTerms.length ? Math.round((matched.length / uniqueTerms.length) * 100) : 0;
  // "required" heuristic: top 15 most frequent JD terms
  const requiredTerms = uniqueTerms.slice(0, 15);
  const requiredMatched = requiredTerms.filter(t => matched.includes(t));
  const requiredMatchPercent = requiredTerms.length ? Math.round((requiredMatched.length / requiredTerms.length) * 100) : 0;

  return { matched, missing: missing.slice(0, 20), overallPercent, requiredMatchPercent, requiredTerms };
}

function roleKeywordGap(resumeLower, role) {
  const lib = ROLE_LIBRARY[role];
  if (!lib) return null;
  const matched = lib.keywords.filter(k => new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(resumeLower));
  const missing = lib.keywords.filter(k => !matched.includes(k));
  const matchPercent = Math.round((matched.length / lib.keywords.length) * 100);
  return { role, matched, missing, matchPercent, projects: lib.projects };
}

function buildActionPlan(ctx) {
  const items = [];
  if (ctx.contact.score < 8) items.push({ tier: "FIX NOW", text: "Add any missing contact details (email, phone, LinkedIn) so recruiters can reach you." });
  if (ctx.parsability.risk !== "Low") items.push({ tier: "FIX NOW", text: "Simplify formatting — use standard section headings and avoid tables/columns that can confuse ATS parsers." });
  if (ctx.summary.score < 7) items.push({ tier: "HIGH IMPACT", text: "Tighten your summary to 2–3 sentences naming your target role, core skills, and value — cut generic phrases." });
  if (ctx.experience.quantifiedRatio < 0.4) items.push({ tier: "HIGH IMPACT", text: "Add numbers to your experience bullets (%, $, time saved, users, scale) wherever you can verify them." });
  if (ctx.experience.weakPhraseHits && ctx.experience.weakPhraseHits.length) items.push({ tier: "HIGH IMPACT", text: `Replace weak phrases like "${ctx.experience.weakPhraseHits[0]}" with strong action verbs (built, led, improved, launched).` });
  if (ctx.jobMatch && ctx.jobMatch.missing.length) items.push({ tier: "HIGH IMPACT", text: `Work in job-specific terms you're missing, such as: ${ctx.jobMatch.missing.slice(0, 5).join(", ")}.` });
  if (ctx.roleGap && ctx.roleGap.missing.length) items.push({ tier: "MEDIUM IMPACT", text: `For ${ctx.roleGap.role} roles, consider adding: ${ctx.roleGap.missing.slice(0, 5).join(", ")} (only if genuinely true).` });
  if (ctx.writing.firstPersonHits > 5) items.push({ tier: "MEDIUM IMPACT", text: "Drop first-person pronouns (\"I\") — resume bullets read stronger without them." });
  items.push({ tier: "OPTIONAL", text: "Ask the assistant to explain any score category in plain language, or to suggest role-specific projects." });
  return items.slice(0, 5);
}

// ---------- Rendering ----------
function renderResults(a) {
  $("#emptyState").classList.add("hidden");
  $("#resultsPanel").classList.remove("hidden");

  $("#scoreNumber").textContent = a.total;
  const ring = $("#scoreRingFg");
  const circumference = 2 * Math.PI * 54;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference * (1 - a.total / 100)}`;
  ring.setAttribute("stroke", scoreColor(a.total));

  $("#scoreBand").textContent = scoreBandLabel(a.total);
  $("#scoreBand").style.color = scoreColor(a.total);

  const cats = [
    ["ATS Parsability", a.scores.parsability, 20],
    ["Contact & Header", a.scores.contact, 10],
    ["Summary & Target Role", a.scores.summary, 10],
    ["Experience Quality", a.scores.experience, 20],
    ["Skills & Keywords", a.scores.skills, 15],
    ["Education / Projects / Certs", a.scores.eduProjCert, 10],
    ["Writing Quality", a.scores.writing, 5],
    ["Hiring Readiness", a.scores.hiringReadiness, 10],
  ];
  const catWrap = $("#categoryList");
  catWrap.innerHTML = "";
  cats.forEach(([label, val, max]) => {
    const pct = Math.round((val / max) * 100);
    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `
      <div class="cat-label"><span>${label}</span><span class="cat-val">${val}/${max}</span></div>
      <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%; background:${scoreColor(pct)}"></div></div>
    `;
    catWrap.appendChild(row);
  });

  // action plan
  const planWrap = $("#actionPlan");
  planWrap.innerHTML = "";
  a.actionPlan.forEach(item => {
    const el = document.createElement("li");
    el.className = "plan-item tier-" + item.tier.replace(/\s+/g, "-").toLowerCase();
    el.innerHTML = `<span class="tier-tag">${item.tier}</span><span>${item.text}</span>`;
    planWrap.appendChild(el);
  });

  // job match / role gap
  const matchWrap = $("#matchSection");
  matchWrap.innerHTML = "";
  if (a.jobMatch) {
    matchWrap.innerHTML = `
      <h3>Job Match</h3>
      <div class="match-percent">${a.jobMatch.overallPercent}% overall keyword match</div>
      <div class="chip-group"><strong>Matched:</strong> ${chipList(a.jobMatch.matched.slice(0, 15))}</div>
      <div class="chip-group"><strong>Missing:</strong> ${chipList(a.jobMatch.missing.slice(0, 15), true)}</div>
    `;
  } else if (a.roleGap) {
    matchWrap.innerHTML = `
      <h3>${a.roleGap.role} — Role Fit</h3>
      <div class="match-percent">${a.roleGap.matchPercent}% of common ${a.roleGap.role} keywords found</div>
      <div class="chip-group"><strong>Found:</strong> ${chipList(a.roleGap.matched)}</div>
      <div class="chip-group"><strong>Consider adding:</strong> ${chipList(a.roleGap.missing, true)}</div>
      <div class="proj-suggest"><strong>Project ideas for this role:</strong>
        <ul>${a.roleGap.projects.map(p => `<li>${p}</li>`).join("")}</ul>
      </div>
    `;
  } else {
    matchWrap.innerHTML = `<p class="hint">Paste a job description or pick a target role above, then rescan to see keyword match and role-specific project ideas.</p>`;
  }

  // findings
  const findWrap = $("#findingsList");
  const findings = [];
  if (!a.sections.summary) findings.push("No summary/objective section detected.");
  if (!a.sections.skills) findings.push("No dedicated skills section detected.");
  if (!a.sections.projects) findings.push("No projects section detected — consider adding one, especially with limited work experience.");
  if (a.parsability.risk !== "Low") findings.push(`Formatting risk: ${a.parsability.risk} — simplify layout for reliable ATS parsing.`);
  if (a.summary.present && a.summary.genericHits.length) findings.push(`Generic phrasing in summary: "${a.summary.genericHits.join('", "')}".`);
  if (findings.length === 0) findings.push("No major structural issues detected — see the action plan for optimization ideas.");
  findWrap.innerHTML = findings.map(f => `<li>${f}</li>`).join("");

  $("#disclaimer").classList.remove("hidden");
}

function chipList(arr, missing) {
  if (!arr.length) return '<span class="hint">none</span>';
  return arr.map(t => `<span class="chip ${missing ? "chip-missing" : "chip-match"}">${t}</span>`).join(" ");
}

function scoreColor(v) {
  if (v >= 80) return "#2FBF8F";
  if (v >= 60) return "#D8A93B";
  return "#E2604F";
}
function scoreBandLabel(v) {
  if (v >= 90) return "Excellent readiness";
  if (v >= 80) return "Strong readiness";
  if (v >= 70) return "Moderate readiness";
  if (v >= 60) return "Needs improvement";
  return "High-priority revision";
}

// ---------- Export ----------
$("#exportBtn").addEventListener("click", () => {
  if (!state.analysis) return;
  const a = state.analysis;
  const lines = [
    `ATS RESUME INTELLIGENCE — REPORT`,
    `File: ${state.fileName || "pasted text"}`,
    `Overall Score: ${a.total}/100 (${scoreBandLabel(a.total)})`,
    ``,
    `CATEGORY BREAKDOWN`,
    `ATS Parsability: ${a.scores.parsability}/20`,
    `Contact & Header: ${a.scores.contact}/10`,
    `Summary & Target Role: ${a.scores.summary}/10`,
    `Experience Quality: ${a.scores.experience}/20`,
    `Skills & Keywords: ${a.scores.skills}/15`,
    `Education/Projects/Certs: ${a.scores.eduProjCert}/10`,
    `Writing Quality: ${a.scores.writing}/5`,
    `Hiring Readiness: ${a.scores.hiringReadiness}/10`,
    ``,
    `TOP ACTIONS`,
    ...a.actionPlan.map((i, idx) => `${idx + 1}. [${i.tier}] ${i.text}`),
    ``,
    `Note: This is an ATS-style compatibility estimate, not a guarantee of interviews or hiring outcomes. Actual ATS systems and employer processes vary.`
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ats-resume-report.txt";
  link.click();
  URL.revokeObjectURL(url);
});

// ---------- Chat Assistant ----------
const chatLog = $("#chatLog");
const chatInput = $("#chatInput");
const chatSendBtn = $("#chatSendBtn");
const chatChips = $("#chatChips");

const SUGGESTED_PROMPTS = [
  "Why is my score low?",
  "What keywords am I missing?",
  "What projects should I add?",
  "How do I explain a career gap?",
  "How do I get hired faster?",
];

SUGGESTED_PROMPTS.forEach(p => {
  const chip = document.createElement("button");
  chip.className = "chip-btn";
  chip.textContent = p;
  chip.addEventListener("click", () => { chatInput.value = p; sendChat(); });
  chatChips.appendChild(chip);
});

chatSendBtn.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

function addChatMessage(text, from) {
  const div = document.createElement("div");
  div.className = "chat-msg " + (from === "user" ? "from-user" : "from-bot");
  div.innerHTML = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function chatSystemNote(analysis) {
  addChatMessage(`I scanned your resume — overall score is <strong>${analysis.total}/100</strong> (${scoreBandLabel(analysis.total)}). Ask me why, or tap a suggestion below.`, "bot");
}

function sendChat() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  addChatMessage(escapeHtml(msg), "user");
  chatInput.value = "";
  const reply = respondToChat(msg.toLowerCase());
  setTimeout(() => addChatMessage(reply, "bot"), 250);
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function respondToChat(msg) {
  const a = state.analysis;
  if (!a) {
    return "Upload or paste a resume and hit <strong>Scan My Resume</strong> first — then I can give specific answers instead of general tips.";
  }

  if (/why.*(low|score)|score.*(low|why)/.test(msg)) {
    const cats = [
      ["ATS Parsability", a.scores.parsability, 20],
      ["Contact & Header", a.scores.contact, 10],
      ["Summary & Target Role", a.scores.summary, 10],
      ["Experience Quality", a.scores.experience, 20],
      ["Skills & Keywords", a.scores.skills, 15],
      ["Education/Projects/Certs", a.scores.eduProjCert, 10],
      ["Writing Quality", a.scores.writing, 5],
      ["Hiring Readiness", a.scores.hiringReadiness, 10],
    ].map(([l, v, m]) => [l, v / m]).sort((x, y) => x[1] - y[1]);
    const weakest = cats.slice(0, 2).map(c => c[0]);
    return `Your two weakest areas are <strong>${weakest[0]}</strong> and <strong>${weakest[1]}</strong>. Check the action plan on the left — I've listed the specific fixes for those first.`;
  }

  if (/keyword|missing.*(word|term)/.test(msg)) {
    if (a.jobMatch && a.jobMatch.missing.length) {
      return `Based on the job description you pasted, you're missing: <strong>${a.jobMatch.missing.slice(0, 8).join(", ")}</strong>. Only add ones that genuinely reflect your experience.`;
    }
    if (a.roleGap && a.roleGap.missing.length) {
      return `For ${a.roleGap.role}, commonly expected keywords not yet on your resume: <strong>${a.roleGap.missing.slice(0, 8).join(", ")}</strong>. Add any you can truthfully back up.`;
    }
    return `Paste a job description or pick a target role above and rescan — then I can tell you exactly which keywords you're missing for that role.`;
  }

  if (/project/.test(msg)) {
    const role = (a.roleGap && a.roleGap.role) || state.role;
    if (role && ROLE_LIBRARY[role]) {
      return `Good project ideas for ${role}:<ul>${ROLE_LIBRARY[role].projects.map(p => `<li>${p}</li>`).join("")}</ul>`;
    }
    return `Pick a target role in the dropdown above and rescan — I'll suggest specific, resume-worthy project ideas for that role.`;
  }

  if (/gap|explain.*(break|time off|unemployed)/.test(msg)) {
    return `A short, honest line usually works best — e.g. naming the reason briefly (study, caregiving, health, layoff, job search) and what you did with the time. I can't invent a reason for you, but if you tell me the real reason, I can help you phrase it concisely.`;
  }

  if (/hire|get hired|interview|land a job|how do i get/.test(msg)) {
    return `General tips that consistently help: (1) tailor your resume's keywords to each job description, (2) quantify your impact wherever true, (3) keep formatting simple so ATS systems parse it cleanly, (4) lead your summary with your target role, and (5) build 1–2 projects that directly demonstrate the role's core skills. This is general guidance — it doesn't guarantee an interview or offer.`;
  }

  if (/summary|objective/.test(msg)) {
    if (a.summary.present) {
      return `Your current summary is about ${a.summary.wordCount} words. Aim for 2–3 sentences: your target role, your strongest relevant skills, and one concrete outcome — and cut generic phrases like "hardworking" or "team player".`;
    }
    return `You don't have a summary section yet. Add 2–3 sentences at the top naming your target role and your strongest, most relevant skills.`;
  }

  if (/skill/.test(msg)) {
    return `I found ${a.skillsFound.length} recognizable skills on your resume${a.skillsFound.length ? ": " + a.skillsFound.slice(0, 10).join(", ") : ""}. Only list skills you can speak to confidently in an interview.`;
  }

  if (/format|parsab|layout|table|column/.test(msg)) {
    return `Formatting risk is currently <strong>${a.parsability.risk}</strong>. If it's Medium or High, avoid tables, text boxes, and multi-column layouts — a single-column layout with standard headings (Experience, Education, Skills) parses most reliably.`;
  }

  return `I can help with: why your score is what it is, missing keywords, project ideas for a target role, explaining a resume gap, or general hiring tips. Try one of the suggestions below, or ask me directly.`;
}
