import type { Context } from "hono";
import { OllamaService } from "../../../aggregator/src/extractors/OllamaService";
import { KnowledgeRepository } from "../../../aggregator/src/repositories/KnowledgeRepository";
import { ComponentBenchmarkRepository } from "../../../aggregator/src/repositories/ComponentBenchmarkRepository";
import {
  SoftwareRequirementsRepository,
  type SoftwareRequirementRow,
} from "../../../aggregator/src/repositories/SoftwareRequirementsRepository";
import {
  WorkloadRepository,
  type WorkloadRequirement,
} from "../../../aggregator/src/repositories/WorkloadRepository";
import { reconnectDb } from "../../../aggregator/src/repositories/connection";

const SUPPORT_BOT_VERSION = "2026-04-18-1";
console.log(`[SupportChat] Loaded ${SUPPORT_BOT_VERSION}`);

const ollama = new OllamaService();
const knowledgeRepo = new KnowledgeRepository();
const benchmarkRepo = new ComponentBenchmarkRepository();
const softwareRepo = new SoftwareRequirementsRepository();
const workloadRepo = new WorkloadRepository();

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

const SUPPORT_CHAT_MAX_CHARS = envInt("SUPPORT_CHAT_MAX_CHARS", 350);
const RAG_MAX_CONTEXT_CHARS = envInt("RAG_MAX_CONTEXT_CHARS", 6000);
const RAG_MAX_EXTRA_CONTEXT_CHARS = envInt("RAG_MAX_EXTRA_CONTEXT_CHARS", 2200);

function uniqStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

let softwareCache:
  | {
      loadedAtMs: number;
      rows: SoftwareRequirementRow[];
    }
  | null = null;

let workloadCache:
  | {
      loadedAtMs: number;
      rows: WorkloadRequirement[];
    }
  | null = null;

function isDbConnectionClosed(err: any): boolean {
  const code = err?.code;
  if (code === "ERR_POSTGRES_CONNECTION_CLOSED") return true;
  const message = String(err?.message || "");
  return /connection closed/i.test(message);
}

async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isDbConnectionClosed(err)) throw err;

    softwareCache = null;
    workloadCache = null;
    await reconnectDb();

    return await fn();
  }
}

async function getSoftwareProfiles(): Promise<SoftwareRequirementRow[]> {
  const ttlMs = 5 * 60 * 1000;
  if (softwareCache && Date.now() - softwareCache.loadedAtMs < ttlMs) {
    return softwareCache.rows;
  }

  const rows = await softwareRepo.getAll();
  softwareCache = { loadedAtMs: Date.now(), rows };
  return rows;
}

async function getWorkloadProfiles(): Promise<WorkloadRequirement[]> {
  const ttlMs = 5 * 60 * 1000;
  if (workloadCache && Date.now() - workloadCache.loadedAtMs < ttlMs) {
    return workloadCache.rows;
  }

  const rows = await workloadRepo.getAll();
  workloadCache = { loadedAtMs: Date.now(), rows };
  return rows;
}

function truncate(text: string, max = 900): string {
  const t = fixEncodingArtifacts(text).trim();
  return t.length <= max ? t : `${t.slice(0, max)}...`;
}

function truncateHard(text: string, max: number): string {
  const t = fixEncodingArtifacts(text).trim();
  if (!Number.isFinite(max) || max <= 0) return t;
  if (t.length <= max) return t;
  if (max <= 3) return "...".slice(0, max);
  return t.slice(0, max - 3).trimEnd() + "...";
}

function fixEncodingArtifacts(text: string): string {
  return String(text ?? "")
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Å“/g, '"')
    .replace(/Ã¢â‚¬Â/g, '"')
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€”/g, "-")
    .replace(/â€“/g, "-");
}

function joinWithLimit(parts: string[], separator: string, maxChars: number): string {
  if (!Number.isFinite(maxChars) || maxChars <= 0) return parts.join(separator);

  const out: string[] = [];
  let used = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const next = out.length === 0 ? trimmed : separator + trimmed;
    if (used + next.length > maxChars) break;
    out.push(trimmed);
    used += next.length;
  }

  return out.join(separator).trim();
}

function sanitizeForContext(text: string): string {
  return text
    .replace(/^#{1,6}\s*Software Requirement:\s*/gim, "Software: ")
    .replace(/^#{1,6}\s*Workload Requirement:\s*/gim, "Workload: ")
    .replace(/^generated from the database\.\s*$/gim, "")
    .replace(/^\s*(?:workload id|software id|id)\s*:\s*.*$/gim, "")
    .trim();
}

function cleanAssistantAnswer(raw: string): string {
  const withoutRefs = raw
    .split(/\n{2,}(sources?|references?)\s*:\s*\n/i)[0]!
    .split(/\n(sources?|references?)\s*:\s*/i)[0]!;

  return withoutRefs
    .replace(/\s*\[\d+\]\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\b(in|from)\s+(these|the)\s+sources\b/gi, "in our compatibility info")
    .replace(/\bthese\s+sources\b/gi, "our compatibility info")
    .replace(/^according to\s+(our\s+)?(notes|internal context)\s*[:,]?\s*/i, "")
    .replace(/\baccording to\s+(our\s+)?(notes|internal context)\b[:\s-]*/gi, "")
    .replace(/\bbased on\s+(our\s+)?(notes|internal context)\b[:\s-]*/gi, "")
    .replace(/\bfrom\s+(our\s+)?(notes|internal context)\b[:\s-]*/gi, "")
    .replace(/\bour\s+notes\b/gi, "our compatibility info")
    .replace(/\bin\s+our\s+notes\b/gi, "in our compatibility info")
    .replace(/\bnotes\b/gi, "compatibility info")
    .replace(/\binternal context\b/gi, "compatibility info")
    .replace(/^according to\s+source\s*\d+\s*[:,]?\s*/i, "")
    .replace(/^(according to|based on)\s+the\s+(provided\s+)?sources[:,]?\s*/i, "")
    .replace(/^sources?[:,]?\s*/i, "")
    .replace(/\bSource\s*\d+\b[:\s-]*/gi, "")
    .replace(/\bworkload\s+requirement\s*:\s*/gi, "")
    .replace(/\bsoftware\s+requirement\s*:\s*/gi, "")
    .replace(/\bworkload id\b/gi, "")
    .trim();
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function detectSoftwareKeysFromText(
  text: string,
  profiles: SoftwareRequirementRow[],
): string[] {
  const raw = (text || "").toLowerCase();
  const norm = normalizeToken(text || "");
  const matches: string[] = [];

  for (const p of profiles) {
    const key = String(p.software_key || "").trim();
    const name = String(p.software_name || "").trim();
    if (!key && !name) continue;

    const keyNorm = key ? normalizeToken(key) : "";
    const nameNorm = name ? normalizeToken(name) : "";

    if (key && (raw.includes(key.toLowerCase()) || (keyNorm && norm.includes(keyNorm)))) {
      matches.push(key);
      continue;
    }

    if (name && (raw.includes(name.toLowerCase()) || (nameNorm && norm.includes(nameNorm)))) {
      matches.push(key || name);
    }
  }

  const exact = uniqStrings(matches).slice(0, 4);
  if (exact.length) return exact;

  // Alias mapping for common variants/synonyms.
  const aliasToKey: Record<string, string> = {
    examplify: "examsoft",
    examsoft: "examsoft",
    examsfot: "examsoft",
    lock_down_browser: "respondus",
    lockdownbrowser: "respondus",
    lockdown: "respondus",
    respondus: "respondus",
    "respondus lockdown browser": "respondus",
    office365: "m365",
    microsoft365: "m365",
    "microsoft office": "m365",
    o365: "m365",
    "office 365": "m365",
    autocad: "autocad",
    solidworks: "solidworks",
    solidwork: "solidworks",
    revit: "revit",
    arcgis: "arcgispro",
    "arcgis pro": "arcgispro",
    arcgispro: "arcgispro",
    matlab: "matlab",
  };

  for (const [alias, key] of Object.entries(aliasToKey)) {
    const aliasNorm = normalizeToken(alias);
    if (aliasNorm && norm.includes(aliasNorm)) return [key];
  }

  // Fuzzy matching (typos) using a pg_trgm-like similarity.
  const autoThreshold = Number.parseFloat(process.env.SOFTWARE_FUZZY_AUTO_THRESHOLD ?? "0.52");
  const ambiguousDelta = Number.parseFloat(process.env.SOFTWARE_FUZZY_AMBIGUOUS_DELTA ?? "0.05");

  const words = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const ngrams: string[] = [];
  const maxN = Math.min(4, words.length);
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= maxN && i + n <= words.length; n++) {
      const slice = words.slice(i, i + n).join(" ");
      if (slice.length >= 4) ngrams.push(slice);
    }
  }
  if (!ngrams.length) return [];

  const trigrams = (s: string): string[] => {
    const t = `  ${normalizeToken(s)}  `;
    if (t.length < 3) return [];
    const out: string[] = [];
    for (let i = 0; i < t.length - 2; i++) out.push(t.slice(i, i + 3));
    return out;
  };

  const trigramSim = (a: string, b: string): number => {
    const A = trigrams(a);
    const B = trigrams(b);
    if (!A.length || !B.length) return 0;
    const setB = new Map<string, number>();
    for (const x of B) setB.set(x, (setB.get(x) ?? 0) + 1);
    let inter = 0;
    for (const x of A) {
      const c = setB.get(x) ?? 0;
      if (c > 0) {
        inter++;
        setB.set(x, c - 1);
      }
    }
    return (2 * inter) / (A.length + B.length);
  };

  let bestKey: string | null = null;
  let best = 0;
  let second = 0;

  for (const p of profiles) {
    const key = String(p.software_key || "").trim();
    const name = String(p.software_name || "").trim();
    if (!key && !name) continue;

    let score = 0;
    for (const g of ngrams) {
      if (name) score = Math.max(score, trigramSim(g, name));
      if (key) score = Math.max(score, trigramSim(g, key));
    }

    if (score > best) {
      second = best;
      best = score;
      bestKey = key || null;
    } else if (score > second) {
      second = score;
    }
  }

  if (!bestKey) return [];
  if (best < autoThreshold) return [];
  if (second > 0 && best - second < ambiguousDelta) return [];

  return [bestKey];
}

function detectWorkloadNamesFromText(text: string, workloads: WorkloadRequirement[]): string[] {
  const raw = (text || "").toLowerCase();
  const norm = normalizeToken(text || "");
  const matches: string[] = [];

  for (const w of workloads) {
    const name = String(w.workload_name || "").trim();
    if (!name) continue;
    const nameLower = name.toLowerCase();
    const nameNorm = normalizeToken(name);

    if (raw.includes(nameLower) || (nameNorm && norm.includes(nameNorm))) {
      matches.push(name);
    }
  }

  return uniqStrings(matches).slice(0, 4);
}

type HistoryMessage = { role: "user" | "assistant" | "system"; content: string };

function normalizeHistory(value: any): HistoryMessage[] {
  if (!Array.isArray(value)) return [];

  const out: HistoryMessage[] = [];
  for (const item of value) {
    if (typeof item === "string") continue;

    const roleRaw = String(item?.role || "").toLowerCase();
    const content = typeof item?.content === "string" ? item.content : "";
    if (!content.trim()) continue;

    if (roleRaw === "user" || roleRaw === "assistant" || roleRaw === "system") {
      out.push({ role: roleRaw as any, content });
    }
  }

  return out;
}

function lastAssistantMessage(history: HistoryMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]!;
    if (m.role === "assistant") return m.content;
  }
  return "";
}

function lastUserMessage(history: HistoryMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]!;
    if (m.role === "user") return m.content;
  }
  return "";
}

function takeLastMessages<T>(arr: T[], max: number): T[] {
  if (max <= 0) return [];
  return arr.length <= max ? arr : arr.slice(arr.length - max);
}

function formatHistoryForRewrite(history: HistoryMessage[], maxMessages: number): string {
  const tail = takeLastMessages(history, maxMessages);
  return tail
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n")
    .trim();
}

function formatUserHistory(history: HistoryMessage[], maxMessages: number): string {
  const users = history.filter((m) => m.role === "user");
  const tail = takeLastMessages(users, maxMessages);
  return tail.map((m) => m.content).join("\n").trim();
}

function detectOsFromText(text: string): "win" | "mac" | null {
  const t = (text || "").toLowerCase();
  if (/\b(windows|win11|win 11|win10|win 10|win)\b/.test(t)) return "win";
  if (/\b(macos|mac os|osx|os x|mac)\b/.test(t)) return "mac";
  return null;
}

async function rewriteSearchQueryWithHistory(params: {
  history: HistoryMessage[];
  message: string;
}): Promise<string> {
  const historyText = formatHistoryForRewrite(params.history, 12);
  if (!historyText) return params.message;

  const system = {
    role: "system" as const,
    content:
      "Rewrite the user's latest message into a single standalone search query for retrieving relevant internal notes. " +
      "Use conversation history only to resolve pronouns or missing context. " +
      "Do not answer the user. Do not add new facts. " +
      "If the latest message is unrelated chatter (e.g. 'bruh') or not a question, return an empty string.",
  };

  const user = {
    role: "user" as const,
    content:
      `CONVERSATION (most recent last):\n${historyText}\n\n` +
      `LATEST USER MESSAGE:\n${params.message}\n\n` +
      "Return ONLY the rewritten search query, one line.",
  };

  const rewritten = await ollama.chat([system, user]);
  return String(rewritten || "").trim();
}

async function buildRetrievalPlan(params: {
  history: HistoryMessage[];
  message: string;
  softwareProfiles: SoftwareRequirementRow[];
  workloadProfiles: WorkloadRequirement[];
}): Promise<{
  mode: "clarify" | "retrieve";
  searchQuery: string;
  needsRetrieval: boolean;
  softwareKeys: string[];
  workloadNames: string[];
  clarifyingQuestions: string[];
}> {
  const historyText = formatHistoryForRewrite(params.history, 14);

  const softwareList = params.softwareProfiles
    .map((p) => `${p.software_key}: ${p.software_name} (os=${p.os_requirement})`)
    .join("\n");

  const workloadList = params.workloadProfiles.map((w) => w.workload_name).join("\n");

  const system = {
    role: "system" as const,
    content:
      "Return STRICT JSON with keys: mode (\"clarify\"|\"retrieve\"), search_query (string), needs_retrieval (boolean), software_keys (string[]), workload_names (string[]), clarifying_questions (string[]). " +
      "This JSON will be used to retrieve internal notes and decide whether to ask follow-up questions first. " +
      "Use conversation history only to resolve references and follow-ups. " +
      "software_keys must be chosen ONLY from the provided software list (use the software_key values). " +
      "workload_names must be chosen ONLY from the provided workload list (exact names). " +
      "Prefer mode=clarify when the user asks a broad question (e.g. choosing a laptop, Mac vs Windows, 'what should I get') or when key details are missing; in that case return 1-3 short clarifying_questions and keep search_query empty. " +
      "Use mode=retrieve when the user's question can be answered from internal notes; set search_query to a short retrieval query focused on the latest message. " +
      "needs_retrieval should be false when software_keys/workload_names are sufficient to answer without vector search. " +
      "If the latest message is unrelated chatter or not a question, return mode=clarify, empty search_query, empty arrays, and 1 clarifying question asking what software and OS they mean.",
  };

  const user = {
    role: "user" as const,
    content:
      `SOFTWARE LIST (choose keys only):\n${softwareList}\n\n` +
      `WORKLOAD LIST (choose exact names only):\n${workloadList}\n\n` +
      (historyText ? `HISTORY:\n${historyText}\n\n` : "") +
      `LATEST USER MESSAGE:\n${params.message}\n\n` +
      "JSON:",
  };

  const raw = await ollama.chat([system, user]);
  if (!raw) {
    return {
      mode: "clarify",
      searchQuery: "",
      needsRetrieval: false,
      softwareKeys: [],
      workloadNames: [],
      clarifyingQuestions: ["What software are you using, and are you on Windows or macOS?"],
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const modeRaw = typeof parsed.mode === "string" ? parsed.mode.trim().toLowerCase() : "";
    const mode: "clarify" | "retrieve" = modeRaw === "clarify" ? "clarify" : "retrieve";

    const searchQuery = typeof parsed.search_query === "string" ? parsed.search_query.trim() : "";
    const softwareKeys = Array.isArray(parsed.software_keys)
      ? parsed.software_keys.filter((v: any) => typeof v === "string")
      : [];
    const workloadNames = Array.isArray(parsed.workload_names)
      ? parsed.workload_names.filter((v: any) => typeof v === "string")
      : [];

    const clarifyingQuestions = Array.isArray(parsed.clarifying_questions)
      ? parsed.clarifying_questions.filter((v: any) => typeof v === "string").map((v: string) => v.trim()).filter(Boolean)
      : [];

    const hasStructured = softwareKeys.length > 0 || workloadNames.length > 0;
    const needsRetrieval =
      typeof parsed.needs_retrieval === "boolean" ? parsed.needs_retrieval : !hasStructured;

    return { mode, searchQuery, needsRetrieval, softwareKeys, workloadNames, clarifyingQuestions };
  } catch {
    return {
      mode: "retrieve",
      searchQuery: params.message,
      needsRetrieval: true,
      softwareKeys: [],
      workloadNames: [],
      clarifyingQuestions: [],
    };
  }
}

function parseDbSourceUri(sourceUri: string): { table: string; id: string } | null {
  const m = sourceUri.match(/^([a-z_]+)\/([0-9a-f-]{36})$/i);
  if (!m) return null;
  return { table: m[1]!.toLowerCase(), id: m[2]! };
}

function asStringArray(value: any): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "string");
    } catch {
      // ignore
    }
  }
  return [];
}

function renderMinSpecsLines(minSpecs: unknown): string[] {
  if (minSpecs == null) return [];

  let value: any = minSpecs;
  if (typeof minSpecs === "string") {
    const trimmed = minSpecs.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [`- ${trimmed}`];
    }
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return [`- ${String(value)}`];
  }

  const entries = Object.entries(value as Record<string, any>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return entries.map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
}

function wantsRequirementsAnswer(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    /\b(min(imum)?|requirements?|reqs?)\b/.test(m) ||
    /\bwhat do i need\b/.test(m) ||
    /\bsafest specs\b/.test(m)
  );
}

function wantsUpgradeAdvice(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    /\b(should i|get|go for|upgrade|worth it)\b/.test(m) &&
    (/\b(16|32)\s*gb\b/.test(m) || /\bram\b/.test(m) || /\bcpu\b/.test(m) || /\bstorage\b/.test(m))
  );
}

function wantsTradeoffAdvice(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    /\b(little better|better computer|better laptop)\b/.test(m) ||
    /\b(what to upgrade|which specs|what specs)\b/.test(m) ||
    /\b(what should i upgrade|upgrade first)\b/.test(m) ||
    /\b(spend more on|prioritize)\b/.test(m)
  );
}

function isRamQuestion(message: string): boolean {
  const m = (message || "").toLowerCase();
  return /\bram\b/.test(m) || /\bmemory\b/.test(m);
}

function isCompatibilityQuestion(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    /\b(compatible|compatibility|run|work|works|support|supported)\b/.test(m) ||
    /\b(mac|macos|windows|win)\b/.test(m)
  );
}

function isCanRunQuestion(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    /\b(can i|can you|can it|will it)\s+(run|handle|support)\b/.test(m) ||
    /\b(can run|run)\s+[a-z0-9]/.test(m) ||
    /\b(laptop|computer)\b.*\b(for|to)\b.*\b(run|handle)\b/.test(m)
  );
}

function isBroadRecommendationQuestion(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    /\b(recommend|recommendation|what should i get|which laptop|laptop should i get)\b/.test(m) ||
    /\bmac\s+or\s+windows\b/.test(m) ||
    /\bwindows\s+or\s+mac\b/.test(m) ||
    /\bbudget\b/.test(m) ||
    /\$\s*\d+/.test(m) ||
    /\b\d{3,5}\s*(?:usd|dollars?)\b/.test(m)
  );
}

function isOsConcernStatement(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    (/\bmac\b|\bmacos\b|\bwindows\b|\bwin\b/.test(m) &&
      /\b(hard|harder|pain|issue|issues|problem|problems|compat|compatible|incompatible|won't|wont|can't|cant)\b/.test(m)) ||
    (/\bengineering\b/.test(m) && (/\bmac\b|\bmacos\b/.test(m)))
  );
}

function isJustOsMessage(message: string): boolean {
  const m = (message || "").trim().toLowerCase();
  return m === "windows" || m === "win" || m === "mac" || m === "macos" || m === "osx" || m === "os x";
}

function isLowSignalMessage(message: string): boolean {
  const m = (message || "").trim().toLowerCase();
  return (
    m === "ok" ||
    m === "okay" ||
    m === "k" ||
    m === "um" ||
    m === "bruh" ||
    m === "lol" ||
    m === "test"
  );
}

function isJustSoftwareMention(message: string, detectedKeys: string[]): boolean {
  const m = (message || "").trim();
  if (!m) return false;
  if (m.length > 40) return false;
  if (/[?!.]/.test(m)) return false;
  if (/\b(with|for|on|in|and|or)\b/i.test(m)) return false;

  const tokens = m.split(/\s+/).filter(Boolean);
  if (tokens.length > 2) return false;
  return detectedKeys.length === 1;
}

function broadRecommendationClarifier(message: string): string {
  const m = (message || "").toLowerCase();
  const hasBudget =
    /\$\s*\d+/.test(m) || /\bbudget\b/.test(m) || /\b\d{3,5}\s*(?:usd|dollars?)\b/.test(m);
  const askedSpendMoreOn = /\b(spend more on|prioritize|what to upgrade|better cpu|more ram|more storage)\b/.test(m);

  const blocks: string[] = [];

  if (hasBudget && askedSpendMoreOn) {
    blocks.push("If you have ~$1000 and want the biggest day-to-day improvement:");
    blocks.push("- Prefer 16 GB RAM (over 8 GB) for smoother multitasking and longer-term use.");
    blocks.push("- Prefer a 512 GB SSD (over 256 GB) so you don’t run out of space quickly.");
    blocks.push("- Upgrade CPU next; dedicated GPU only if you know you need 3D/video/gaming.");
    blocks.push("");
  }

  const qs: string[] = [];
  qs.push("What program/major are you in, and what required software does your school list (especially exam/proctoring tools)?");
  if (hasBudget) qs.push("Is $1000 your max budget, and does that need to include warranty/accessories?");
  qs.push("Do you strongly prefer Mac, or are you okay with Windows if it’s the safer compatibility choice?");

  blocks.push("Quick questions so I don’t guess:\n- " + qs.slice(0, 3).join("\n- "));

  const answer = blocks.join("\n");
  return SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer;
}

function computeConservativeMinSpecs(workloads: WorkloadRequirement[]): Record<string, any> {
  const out: Record<string, any> = {};
  const cpuExamples: string[] = [];
  const gpuExamples: string[] = [];

  const gpuRank = (v: string | undefined): number => {
    const x = (v || "").toLowerCase();
    if (x === "discrete") return 2;
    if (x === "integrated") return 1;
    return 0;
  };

  const mergeNumberMax = (key: string, value: any) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return;
    const prev = typeof out[key] === "number" ? out[key] : Number(out[key]);
    if (!Number.isFinite(prev) || n > prev) out[key] = n;
  };

  const addExamples = (arr: any, target: string[]) => {
    if (!arr) return;
    if (typeof arr === "string") {
      try {
        const parsed = JSON.parse(arr);
        if (Array.isArray(parsed)) addExamples(parsed, target);
      } catch {
        // ignore
      }
      return;
    }
    if (!Array.isArray(arr)) return;
    for (const v of arr) {
      const s = String(v ?? "").trim();
      if (s) target.push(s);
    }
  };

  for (const w of workloads) {
    let min: any = w.min_specs;
    if (typeof min === "string") {
      try {
        min = JSON.parse(min);
      } catch {
        continue;
      }
    }
    if (!min || typeof min !== "object" || Array.isArray(min)) continue;

    mergeNumberMax("ram_gb", min.ram_gb);
    mergeNumberMax("storage_gb", min.storage_gb);
    mergeNumberMax("min_cpu_score", min.min_cpu_score);
    mergeNumberMax("min_gpu_score", min.min_gpu_score);
    mergeNumberMax("vram_gb", min.vram_gb);
    mergeNumberMax("cpu_cores", min.cpu_cores);

    const prevGpu = String(out.gpu_type || "");
    const nextGpu = String(min.gpu_type || "");
    if (gpuRank(nextGpu) > gpuRank(prevGpu)) out.gpu_type = nextGpu;

    const prevOs = String(out.os_requirement || "");
    const nextOs = String(min.os_requirement || "");
    if (!prevOs) out.os_requirement = nextOs;
    else if (prevOs.toLowerCase() !== nextOs.toLowerCase()) {
      if (prevOs.toLowerCase() === "any") out.os_requirement = nextOs;
    }

    addExamples(min.cpu_examples, cpuExamples);
    addExamples(min.gpu_examples, gpuExamples);
  }

  if (cpuExamples.length) out.cpu_examples = uniqStrings(cpuExamples).slice(0, 2);
  if (gpuExamples.length) out.gpu_examples = uniqStrings(gpuExamples).slice(0, 2);
  return out;
}

function formatMinSpecsForUser(
  specs: Record<string, any>,
  opts?: { includeScores?: boolean },
): string {
  const lines: string[] = [];

  const add = (label: string, value: any) => {
    if (value == null || value === "") return;
    lines.push(`- ${label}: ${value}`);
  };

  const num = (v: any): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const ram = num(specs.ram_gb);
  const storage = num(specs.storage_gb);
  const minCpu = num(specs.min_cpu_score);
  const cores = num(specs.cpu_cores);
  const minGpu = num(specs.min_gpu_score);
  const vram = num(specs.vram_gb);
  const cpuExamples = Array.isArray(specs.cpu_examples) ? (specs.cpu_examples as unknown[]) : [];
  const gpuExamples = Array.isArray(specs.gpu_examples) ? (specs.gpu_examples as unknown[]) : [];

  const formatExamples = (xs: unknown[]): string | null => {
    const names = xs
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 2);
    return names.length ? names.join(" / ") : null;
  };

  const cpuExampleText = formatExamples(cpuExamples);
  const gpuExampleText = formatExamples(gpuExamples);
  const includeScores = opts?.includeScores === true;

  if (ram != null && ram > 0) add("RAM", `${ram} GB`);
  if (storage != null && storage > 0) add("Storage", `${storage} GB`);
  if (cpuExampleText) add("CPU (examples)", cpuExampleText);
  else if (includeScores && minCpu != null && minCpu > 0) add("CPU", `score ${minCpu}+`);
  if (cores != null && cores > 0) add("CPU cores", `${cores}+`);

  const gpuType = String(specs.gpu_type || "").trim();
  if (gpuType) {
    add("GPU", gpuExampleText ? `${gpuType} (e.g. ${gpuExampleText})` : gpuType);
  } else if (gpuExampleText) {
    add("GPU (examples)", gpuExampleText);
  }

  if (includeScores && !gpuExampleText && minGpu != null && minGpu > 0) add("GPU score", `${minGpu}+`);
  if (vram != null && vram > 0) add("VRAM", `${vram} GB+`);
  add("OS", osLabel(specs.os_requirement) || specs.os_requirement || null);

  return lines.join("\n");
}

async function enrichSpecsWithComponentExamples(specs: Record<string, any>): Promise<Record<string, any>> {
  const out = { ...specs };

  const num = (v: any): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const cpuMin = num(out.min_cpu_score);
  const gpuMin = num(out.min_gpu_score);

  const hasCpuExamples = Array.isArray(out.cpu_examples) && out.cpu_examples.length > 0;
  const hasGpuExamples = Array.isArray(out.gpu_examples) && out.gpu_examples.length > 0;

  if (!hasCpuExamples && cpuMin != null && cpuMin > 0) {
    try {
      const examples = await withDbRetry(() =>
        benchmarkRepo.findExamplesByMinScore({ type: "CPU", minScore: cpuMin, limit: 2 }),
      );
      out.cpu_examples = uniqStrings(examples.map((e) => e.component_name)).slice(0, 2);
    } catch {
      // ignore
    }
  }

  if (!hasGpuExamples && gpuMin != null && gpuMin > 0) {
    try {
      const examples = await withDbRetry(() =>
        benchmarkRepo.findExamplesByMinScore({ type: "GPU", minScore: gpuMin, limit: 2 }),
      );
      out.gpu_examples = uniqStrings(examples.map((e) => e.component_name)).slice(0, 2);
    } catch {
      // ignore
    }
  }

  return out;
}

function osLabel(os: unknown): string | null {
  const v = String(os || "").toLowerCase().trim();
  if (!v) return null;
  if (v === "win" || v === "windows") return "Windows";
  if (v === "mac" || v === "macos") return "macOS";
  if (v === "any") return "Windows or macOS";
  return v;
}

function formatSpecsInline(specs: Record<string, any>, opts?: { includeScores?: boolean }): string {
  const includeScores = opts?.includeScores === true;
  const parts: string[] = [];

  const num = (v: any): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const ram = num(specs.ram_gb);
  const storage = num(specs.storage_gb);
  const cores = num(specs.cpu_cores);
  const vram = num(specs.vram_gb);
  const minCpu = num(specs.min_cpu_score);
  const minGpu = num(specs.min_gpu_score);

  const cpuExamples = Array.isArray(specs.cpu_examples) ? (specs.cpu_examples as unknown[]) : [];
  const gpuExamples = Array.isArray(specs.gpu_examples) ? (specs.gpu_examples as unknown[]) : [];
  const cpuExample = cpuExamples.map((x) => String(x || "").trim()).filter(Boolean)[0];
  const gpuExample = gpuExamples.map((x) => String(x || "").trim()).filter(Boolean)[0];

  const gpuType = String(specs.gpu_type || "").trim();
  const os = osLabel(specs.os_requirement);

  if (ram != null && ram > 0) parts.push(`RAM ${ram}GB`);
  if (storage != null && storage > 0) parts.push(`Storage ${storage}GB`);
  if (cores != null && cores > 0) parts.push(`CPU ${cores}+ cores`);
  if (cpuExample) parts.push(`CPU e.g. ${cpuExample}`);
  else if (includeScores && minCpu != null && minCpu > 0) parts.push(`CPU score ${minCpu}+`);

  if (gpuType) parts.push(`GPU ${gpuType}`);
  if (gpuExample) parts.push(`GPU e.g. ${gpuExample}`);
  else if (includeScores && minGpu != null && minGpu > 0) parts.push(`GPU score ${minGpu}+`);

  if (vram != null && vram > 0) parts.push(`VRAM ${vram}GB+`);
  if (os) parts.push(`OS ${os}`);

  return parts.join(", ");
}

function renderSoftwareNote(profile: SoftwareRequirementRow, workloads: WorkloadRequirement[]): string {
  const required = asStringArray(profile.required_workloads);

  const blocks: string[] = [];
  blocks.push(`Software: ${profile.software_name}`);
  blocks.push(`Key: ${profile.software_key}`);
  blocks.push(`OS requirement: ${profile.os_requirement}`);
  if (required.length) blocks.push(`Required workloads: ${required.join(", ")}`);

  for (const name of required) {
    const w = workloads.find((x) => x.workload_name === name);
    if (!w) continue;
    const minSpecLines = renderMinSpecsLines(w.min_specs);
    blocks.push("");
    blocks.push(`Workload: ${w.workload_name}`);
    if (minSpecLines.length) {
      blocks.push("Minimum specs:");
      blocks.push(...minSpecLines);
    }
  }

  return blocks.join("\n");
}

function renderWorkloadNote(workload: WorkloadRequirement): string {
  const minSpecLines = renderMinSpecsLines(workload.min_specs);
  return (
    `Workload: ${workload.workload_name}\n` +
    (minSpecLines.length ? `Minimum specs:\n${minSpecLines.join("\n")}` : "")
  );
}

function findMentionedWorkload(
  message: string,
  workloads: WorkloadRequirement[],
): WorkloadRequirement | null {
  const msg = message.toLowerCase();
  const msgNorm = normalizeToken(message);

  for (const workload of workloads) {
    const name = workload.workload_name?.toLowerCase?.() ?? "";
    if (!name) continue;
    if (msg.includes(name)) return workload;

    const nameNorm = normalizeToken(name);
    if (nameNorm && msgNorm.includes(nameNorm)) return workload;
  }

  return null;
}

function workloadMinimumSpecsAnswer(params: {
  message: string;
  workload: WorkloadRequirement;
}): string {
  const minSpecs =
    typeof params.workload.min_specs === "string"
      ? JSON.parse(params.workload.min_specs)
      : params.workload.min_specs ?? {};

  const lines: string[] = [];
  lines.push(`Minimum specs for ${params.workload.workload_name}:`);

  const cpuExamples =
    Array.isArray(minSpecs?.cpu_examples) && minSpecs.cpu_examples.length
      ? (minSpecs.cpu_examples as unknown[]).map((x: any) => String(x || "").trim()).filter(Boolean).slice(0, 2)
      : [];
  const gpuExamples =
    Array.isArray(minSpecs?.gpu_examples) && minSpecs.gpu_examples.length
      ? (minSpecs.gpu_examples as unknown[]).map((x: any) => String(x || "").trim()).filter(Boolean).slice(0, 2)
      : [];

  if (minSpecs?.ram_gb != null) lines.push(`- RAM: ${minSpecs.ram_gb} GB`);
  if (minSpecs?.storage_gb != null) lines.push(`- Storage: ${minSpecs.storage_gb} GB`);
  if (minSpecs?.cpu_cores != null) lines.push(`- CPU cores: ${minSpecs.cpu_cores}+`);
  if (cpuExamples.length) lines.push(`- CPU (examples): ${cpuExamples.join(" / ")}`);
  if (minSpecs?.gpu_type) lines.push(`- GPU: ${minSpecs.gpu_type}`);
  if (gpuExamples.length) lines.push(`- GPU (examples): ${gpuExamples.join(" / ")}`);
  if (minSpecs?.vram_gb != null) lines.push(`- VRAM: ${minSpecs.vram_gb} GB+`);
  if (minSpecs?.min_cpu_score != null) lines.push(`- Min CPU score: ${minSpecs.min_cpu_score}+`);
  if (minSpecs?.min_gpu_score != null) lines.push(`- Min GPU score: ${minSpecs.min_gpu_score}+`);

  return lines.join("\n");
}

function parseJsonArray(value: any): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "string");
    } catch {
      // ignore
    }
  }
  return [];
}

function isHardwareOrSpecsQuestion(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /\bspecs?\b/.test(m) ||
    /\brequirements?\b/.test(m) ||
    /\brequir/.test(m) || // catches common typos like "requirments"
    /\bminimum\b/.test(m) ||
    /\bmin\b/.test(m) ||
    /\bneed\b/.test(m) ||
    /\bsmooth(ly)?\b/.test(m) ||
    /\bperformance\b/.test(m) ||
    /\benough\b/.test(m) ||
    /\bok(ay)?\b/.test(m) ||
    /\bram\b|\bmemory\b/.test(m) ||
    /\bcpu\b|\bcores?\b/.test(m) ||
    /\bgpu\b|\bvram\b/.test(m) ||
    /\bstorage\b|\bssd\b/.test(m) ||
    /\b\d+\s*gb\b/.test(m)
  );
}

function isOsCompatibilityQuestion(message: string): boolean {
  const m = message.toLowerCase();
  const mentionsOs =
    /\bwindows\b|\bwin\s*11\b|\bwin\s*10\b|\bmac\b|\bmacos\b|\bos x\b|\bchromebook\b|\bchrome\s*os\b|\bchromeos\b/.test(
      m,
    );
  const asksCompat = /\b(work|run|compatible|support|install)\b/.test(m);
  return mentionsOs && asksCompat;
}

function isMacSoftwareOverviewQuestion(message: string): boolean {
  const m = message.toLowerCase();
  const mentionsMac = /\bmac\b|\bmacos\b|\bos x\b|\bmacbook\b|\bapple\b/i.test(m);
  const asksSoftware = /\bsoftware\b|\bapps?\b/.test(m);
  const asksCompatibility =
    /\bcompatible\b|\bcompatibility\b|\bwork\b|\brun\b|\bsupport\b|\bnot\b.*\bcompatible\b|\bworry\b/.test(
      m,
    );
  return mentionsMac && asksSoftware && asksCompatibility;
}

function combineWorkloadMinSpecs(workloads: WorkloadRequirement[]): any {
  const out: any = {};
  const cpuExamples: string[] = [];
  const gpuExamples: string[] = [];

  const maxNum = (key: string, value: any) => {
    if (value == null) return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    out[key] = out[key] == null ? n : Math.max(Number(out[key]), n);
  };

  const addExamples = (arr: any, target: string[]) => {
    if (!arr) return;
    if (typeof arr === "string") {
      try {
        const parsed = JSON.parse(arr);
        if (Array.isArray(parsed)) addExamples(parsed, target);
      } catch {
        // ignore
      }
      return;
    }
    if (!Array.isArray(arr)) return;
    for (const v of arr) {
      const s = String(v ?? "").trim();
      if (s) target.push(s);
    }
  };

  for (const workload of workloads) {
    const minSpecs =
      typeof workload.min_specs === "string"
        ? JSON.parse(workload.min_specs)
        : workload.min_specs ?? {};

    maxNum("ram_gb", minSpecs?.ram_gb);
    maxNum("storage_gb", minSpecs?.storage_gb);
    maxNum("cpu_cores", minSpecs?.cpu_cores);
    maxNum("vram_gb", minSpecs?.vram_gb);
    maxNum("min_cpu_score", minSpecs?.min_cpu_score);
    maxNum("min_gpu_score", minSpecs?.min_gpu_score);

    const gpuType = String(minSpecs?.gpu_type || "").toLowerCase();
    if (gpuType === "discrete") out.gpu_type = "discrete";
    if (!out.gpu_type && gpuType === "integrated") out.gpu_type = "integrated";

    addExamples(minSpecs?.cpu_examples, cpuExamples);
    addExamples(minSpecs?.gpu_examples, gpuExamples);
  }

  if (cpuExamples.length) out.cpu_examples = uniqStrings(cpuExamples).slice(0, 2);
  if (gpuExamples.length) out.gpu_examples = uniqStrings(gpuExamples).slice(0, 2);
  return out;
}

function softwareSpecsAnswer(params: {
  message: string;
  profile: SoftwareRequirementRow;
  workloadProfiles: WorkloadRequirement[];
  overrideWorkloads?: string[];
}): string | null {
  const requiredWorkloads =
    params.overrideWorkloads ?? parseJsonArray(params.profile.required_workloads);
  if (requiredWorkloads.length === 0) return null;

  const matchedWorkloads = requiredWorkloads
    .map((name) => params.workloadProfiles.find((w) => w.workload_name === name) || null)
    .filter(Boolean) as WorkloadRequirement[];

  if (matchedWorkloads.length === 0) return null;

  const combined = combineWorkloadMinSpecs(matchedWorkloads);

  const m = params.message.toLowerCase();
  const name = params.profile.software_name || params.profile.software_key;

  const ramAsked = /\bram\b|\bmemory\b/.test(m) || /\b\d+\s*gb\b/.test(m);
  const ramValue = m.match(/(\d+)\s*gb\s*ram/)?.[1];
  const ramNum = ramValue ? Number(ramValue) : null;

  if (ramAsked && ramNum != null && Number.isFinite(ramNum) && combined?.ram_gb != null) {
    const minRam = Number(combined.ram_gb);
    if (ramNum < minRam) {
      return `${name}: ${ramNum}GB RAM is below the minimum we use (${minRam}GB).`;
    }
    return `${name}: ${ramNum}GB RAM meets the minimum we use (${minRam}GB).`;
  }

  const lines: string[] = [];
  lines.push(`Minimum specs for ${name}:`);
  if (combined?.ram_gb != null) lines.push(`- RAM: ${combined.ram_gb} GB`);
  if (combined?.storage_gb != null) lines.push(`- Storage: ${combined.storage_gb} GB`);
  if (combined?.cpu_cores != null) lines.push(`- CPU cores: ${combined.cpu_cores}+`);
  if (combined?.gpu_type) lines.push(`- GPU: ${combined.gpu_type}`);
  if (combined?.vram_gb != null) lines.push(`- VRAM: ${combined.vram_gb} GB+`);

  // Only include synthetic benchmark floors if the user asked for performance or "smoothly"
  if (/\bperformance\b|\bsmooth(ly)?\b|\bfast\b|\bslow\b/.test(m)) {
    if (combined?.min_cpu_score != null) lines.push(`- Min CPU score: ${combined.min_cpu_score}+`);
    if (combined?.min_gpu_score != null) lines.push(`- Min GPU score: ${combined.min_gpu_score}+`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}

function matlabTierFromText(text: string): "basic" | "heavy" | null {
  const t = text.toLowerCase();

  const heavy =
    /\bsimulink\b/.test(t) ||
    /\bcfd\b/.test(t) ||
    /\bfea\b/.test(t) ||
    /\bfinite\s*element\b/.test(t) ||
    /\bfluid\b/.test(t) ||
    /\bansys\b/.test(t) ||
    /\bgromacs\b/.test(t) ||
    /\bheavy\b/.test(t) ||
    /\bsimulation(s)?\b/.test(t) ||
    /\blarge\b/.test(t) ||
    /\bmodel(s)?\b/.test(t) ||
    /\bgpu\b/.test(t) ||
    /\btraining\b/.test(t) ||
    /\bdeep\s*learning\b/.test(t);

  if (heavy) return "heavy";

  const basic =
    /\bbasic\b/.test(t) ||
    /\bintro\b/.test(t) ||
    /\bhomework\b/.test(t) ||
    /\bclass\b/.test(t) ||
    /\bplots?\b/.test(t) ||
    /\bscripts?\b/.test(t);

  if (basic) return "basic";

  return null;
}

function isMatlabTierReply(message: string): boolean {
  const m = message.toLowerCase();
  return /\bbasic\b/.test(m) || /\bheavy\b/.test(m) || /\bboth\b/.test(m);
}

function lastAssistantAskedMatlabTier(lastAssistant: string): boolean {
  const t = lastAssistant.toLowerCase();
  return (
    t.includes("for matlab") &&
    t.includes("basic coursework") &&
    t.includes("heavy") &&
    t.includes("simulation")
  );
}

function findMentionedSoftware(
  message: string,
  profiles: SoftwareRequirementRow[],
): SoftwareRequirementRow | null {
  const msg = message.toLowerCase();
  const msgNorm = normalizeToken(message);

  for (const profile of profiles) {
    const key = profile.software_key.toLowerCase();
    if (msg.includes(key)) return profile;

    const name = profile.software_name?.toLowerCase?.() ?? "";
    if (name && msg.includes(name)) return profile;

    const nameNorm = name ? normalizeToken(name) : "";
    if (nameNorm && msgNorm.includes(nameNorm)) return profile;
  }

  return null;
}

function softwareCompatibilityAnswer(params: {
  message: string;
  profile: SoftwareRequirementRow;
}): string {
  const msg = params.message.toLowerCase();
  const name = params.profile.software_name || params.profile.software_key;
  const os = (params.profile.os_requirement || "any").toLowerCase();

  const mentionsMac = /\bmac\b|\bmacos\b|\bos x\b|\bmacbook\b|\bapple\b/i.test(msg);
  const mentionsWindows = /\bwindows\b|\bwin\b/i.test(msg);
  const mentionsChromebook = /\bchromebook\b|\bchrome\s*os\b|\bchromeos\b/i.test(msg);

  if (os === "win") {
    if (mentionsMac) {
      return (
        `${name} is Windows-only. ` +
        `On a Mac, you may still be able to use it through a Windows virtual machine or remote Windows PC, ` +
        `but setup is extra work and results can vary.`
      );
    }
    if (!mentionsWindows) {
      return `${name} is Windows-only. Are you on Windows or macOS?`;
    }
    return `${name} is Windows-only.`;
  }

  if (os === "mac") {
    if (mentionsWindows) {
      return `${name} is macOS-only.`;
    }
    if (!mentionsMac) {
      return `${name} is macOS-only. Are you on Windows or macOS?`;
    }
    return `${name} is macOS-only.`;
  }

  if (os === "any") {
    if (mentionsChromebook) {
      return `${name} is listed for Windows or macOS. I don't have ChromeOS/Chromebook compatibility info for it.`;
    }

    if (mentionsWindows && !mentionsMac) {
      return `${name} is listed for Windows.`;
    }

    if (mentionsMac && !mentionsWindows) {
      return `${name} is listed for macOS.`;
    }

    return `${name} is listed for Windows or macOS.`;
  }

  return `I can't find OS compatibility details for ${name} in our current compatibility info. What OS are you on (Windows or macOS)?`;
}

function tryDirectSoftwareCompatibilityAnswer(params: {
  message: string;
  sources: { content: string }[];
}): string | null {
  const msg = params.message.toLowerCase();

  type Profile = {
    name: string | null;
    key: string | null;
    os: string | null;
    requiredWorkloads: string[] | null;
  };

  const parseProfile = (text: string): Profile | null => {
    const name =
      text.match(/^#\s*Software Requirement:\s*(.+)\s*$/im)?.[1]?.trim() ?? null;
    const key =
      text.match(/^\s*(?:Key|Software key)\s*:\s*`?([a-z0-9_-]+)`?\s*$/im)?.[1]?.trim() ??
      null;
    const os = text.match(/^\s*OS requirement\s*:\s*`?(\w+)`?\s*$/im)?.[1]?.trim() ?? null;

    let requiredWorkloads: string[] | null = null;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch);
        if (Array.isArray(parsed)) {
          requiredWorkloads = parsed.filter((v) => typeof v === "string");
        }
      } catch {
        // ignore
      }
    }

    if (!name && !key && !os) return null;
    return { name, key, os, requiredWorkloads };
  };

  const profiles: Profile[] = [];
  for (const s of params.sources) {
    const p = parseProfile(s.content);
    if (p) profiles.push(p);
  }

  const matching = profiles.find((p) => {
    if (p.key && msg.includes(p.key.toLowerCase())) return true;
    if (p.name && msg.includes(p.name.toLowerCase())) return true;
    return false;
  });

  if (!matching || !matching.os) return null;

  const os = matching.os.toLowerCase();
  const name = matching.name ?? "That software";

  if (os === "win") {
    if (/\bmac\b|\bmacos\b|\bos x\b/.test(msg)) {
      return `${name} requires Windows. If you're on macOS, it won't run natively—use a Windows setup or choose a Windows laptop.`;
    }
    return `${name} requires Windows.`;
  }

  if (os === "mac") {
    if (/\bwindows\b|\bwin\b/.test(msg)) {
      return `${name} requires macOS.`;
    }
    return `${name} requires macOS.`;
  }

  if (os === "any") {
    return `${name} is listed as compatible on Windows or macOS.`;
  }

  return null;
}

export async function supportChatController(c: Context) {
  c.header("X-SupportBot-Version", SUPPORT_BOT_VERSION);

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Expected JSON body." }, 400);
  }

  const transientAnswer = (hint?: string) =>
    truncateHard(
      hint?.trim() ||
        "Sorry - I'm having trouble responding right now. Please try again in a moment.",
      SUPPORT_CHAT_MAX_CHARS,
    );

  try {
    const message = String(body?.message || "").trim();
    if (!message) {
      return c.json({ error: "Missing `message`." }, 400);
    }

    const history = normalizeHistory(body?.history);

    const topK = Number.isFinite(Number(body?.topK))
      ? Math.max(1, Math.min(12, Number(body.topK)))
      : 6;
    const debug = body?.debug === true || c.req.query("debug") === "1";

    if (isJustOsMessage(message)) {
      const answer = "Got it. What software are you asking about?";
      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "just-os" } } : {}),
        },
        200,
      );
    }

    if (isLowSignalMessage(message)) {
      const lastA = lastAssistantMessage(history);
      const answer = lastA && /\?\s*$/.test(lastA)
        ? "Got it. " + lastA
        : "What software are you asking about (and are you on Windows or macOS)?";
      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "low-signal" } } : {}),
        },
        200,
      );
    }

    const softwareProfiles = await withDbRetry(() => getSoftwareProfiles());
    const workloadProfiles = await withDbRetry(() => getWorkloadProfiles());

    // Deterministic entity detection (fast and typo-tolerant).
    const userHistoryForDetect = formatUserHistory(history, 8);
    const detectText = userHistoryForDetect ? `${message}\n${userHistoryForDetect}` : message;
    const detectedSoftwareKeys = detectSoftwareKeysFromText(detectText, softwareProfiles);
    const detectedWorkloadNames = detectWorkloadNamesFromText(detectText, workloadProfiles);
    const detectedOs = detectOsFromText(detectText);

    // Message-only detection: used for "just typed the software name" follow-ups.
    // Important: do NOT use history here, otherwise short follow-ups like "requirements"
    // get misclassified as "just software mention" if a software was mentioned earlier.
    const detectedSoftwareKeysInMessage = detectSoftwareKeysFromText(message, softwareProfiles);
    const lastAssistant = lastAssistantMessage(history);

    // "My school/college recommends 32GB..." style messages: handle deterministically (avoid LLM derailment).
    const schoolRecMatch = message.match(/\b(college|school|program)\b[\s\S]{0,40}\brecommend(?:s|ed)?\b[\s\S]{0,20}\b(\d{1,3})\s*gb\b/i);
    if (schoolRecMatch) {
      const ram = Number(schoolRecMatch[2]);
      const keys = detectedSoftwareKeysInMessage.length ? detectedSoftwareKeysInMessage : detectedSoftwareKeys;
      const key = keys[0];
      const name = key ? softwareProfiles.find((p) => p.software_key === key)?.software_name || key : "that software";

      const answer =
        Number.isFinite(ram) && ram > 0
          ? `If your school recommends ${ram} GB RAM for ${name}, that's a good target (more headroom on bigger projects). What's your budget?`
          : `If your school recommends more RAM for ${name}, that's usually for extra headroom on bigger projects. What's your budget?`;

      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "school-recommendation", softwareKeys: keys } } : {}),
        },
        200,
      );
    }

    // For broad shopping/budget questions, avoid Ollama and ask clarifiers first (unless we can answer about a specific software/workload).
    if (
      isBroadRecommendationQuestion(message) &&
      !wantsRequirementsAnswer(message) &&
      !wantsUpgradeAdvice(message) &&
      detectedSoftwareKeys.length === 0 &&
      detectedWorkloadNames.length === 0
    ) {
      const answer = broadRecommendationClarifier(message);
      return c.json(
        {
          answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "broad-clarify" } } : {}),
        },
        200,
      );
    }

    // OS/major concern statements (often not phrased as a question): handle without Ollama.
    if (isOsConcernStatement(message) && detectedSoftwareKeys.length === 0) {
      const answer =
        "For engineering, the biggest Mac risk is Windows-only apps (often CAD/engineering tools). " +
        "If you don’t have the exact required software list yet, Windows is usually the safer choice. " +
        "Do you need any Windows-only tools like SolidWorks or Revit?";
      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "os-concern" } } : {}),
        },
        200,
      );
    }

    // If the bot asked "what software/major", and the user replied with it, continue with targeted advice.
    if (
      detectedSoftwareKeysInMessage.length > 0 &&
      /what software|\bmajor\b/i.test(lastAssistant)
    ) {
      const keys = detectedSoftwareKeysInMessage.slice(0, 2);
      const names = keys
        .map((k) => softwareProfiles.find((p) => p.software_key === k)?.software_name || k)
        .join(" and ");

      const needsGpu = (() => {
        const workloads: WorkloadRequirement[] = [];
        for (const k of keys) {
          const profile = softwareProfiles.find((p) => p.software_key === k);
          if (!profile) continue;
          for (const wlName of asStringArray(profile.required_workloads)) {
            const w = workloadProfiles.find((x) => x.workload_name === wlName);
            if (w) workloads.push(w);
          }
        }
        const specs = computeConservativeMinSpecs(workloads);
        return String(specs.gpu_type || "").toLowerCase() === "discrete";
      })();

      const answer = needsGpu
        ? `Got it — for ${names}, prioritize a dedicated GPU first, then RAM (16 GB+), then SSD (512 GB). Whatâ€™s your budget?`
        : `Got it — for ${names}, prioritize RAM (16 GB+) and a 512 GB SSD, then CPU. Whatâ€™s your budget?`;

      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
        },
        200,
      );
    }

    // If they just typed a software name as a follow-up, don't invoke the LLM: ask one targeted question or continue the prior intent.
    if (isJustSoftwareMention(message, detectedSoftwareKeysInMessage)) {
      const key = detectedSoftwareKeysInMessage[0]!;
      const profile = softwareProfiles.find((p) => p.software_key === key);
      const name = profile?.software_name || key;

      const prevUser = lastUserMessage(history);
      const prevAskedUpgrades = wantsTradeoffAdvice(prevUser) || wantsUpgradeAdvice(prevUser);
      if (prevAskedUpgrades) {
        const answer =
          `If you're buying for ${name} and want a little better than minimum: ` +
          "go for 16 GB RAM and a 512 GB SSD if you can. " +
          "CPU upgrade comes next; you usually don’t need a dedicated GPU for this.";
        return c.json(
          {
            answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
            ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "just-software-upgrade" } } : {}),
          },
          200,
        );
      }

      const answer = `What do you want to know about ${name} — minimum requirements, or Mac/Windows compatibility?`;
      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "just-software" } } : {}),
        },
        200,
      );
    }

    // Create a lightweight "plan" object without calling an LLM planner (avoids extra timeouts).
    const plan = {
      mode: "retrieve" as const,
      searchQuery: message,
      needsRetrieval: true,
      softwareKeys: detectedSoftwareKeys,
      workloadNames: detectedWorkloadNames,
      clarifyingQuestions: [] as string[],
      detectedOs,
    };

    // Software compatibility questions (Windows vs macOS): answer from software profiles without Ollama.
    if (
      plan.softwareKeys.length === 1 &&
      isCompatibilityQuestion(message) &&
      !wantsRequirementsAnswer(message) &&
      !isBroadRecommendationQuestion(message)
    ) {
      const key = plan.softwareKeys[0]!;
      const profile = softwareProfiles.find((p) => p.software_key === key);
      const name = profile?.software_name || key;
      const os = String(profile?.os_requirement || "").toLowerCase();

      let answer = "";
      if (os === "win") answer = `${name} is listed as Windows-only.`;
      else if (os === "mac") answer = `${name} is listed as macOS-only.`;
      else if (os === "any") answer = `${name} is listed as compatible on Windows or macOS.`;
      else answer = `I’m not seeing a clear OS requirement for ${name} in current compatibility info.`;

      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "compat-fast", softwareKey: key } } : {}),
        },
        200,
      );
    }

    // Fast path: if user asks for minimum requirements (or "can it run X") and we can answer directly from DB profiles, do it without the LLM.
    if (
      (wantsRequirementsAnswer(message) || (plan.softwareKeys.length > 0 && isCanRunQuestion(message))) &&
      !wantsUpgradeAdvice(message)
    ) {
      const includeScores = /\b(score|benchmark|passmark)\b/i.test(message);

      // If the user asked for requirements for multiple software items, do NOT collapse into one "max of everything" answer.
      if (wantsRequirementsAnswer(message) && plan.softwareKeys.length > 1) {
        const lines: string[] = [];

        for (const key of plan.softwareKeys.slice(0, 3)) {
          const profile = softwareProfiles.find((p) => p.software_key === key);
          if (!profile) continue;

          const matchedWorkloads = asStringArray(profile.required_workloads)
            .map((wlName) => workloadProfiles.find((x) => x.workload_name === wlName))
            .filter(Boolean) as WorkloadRequirement[];

          const specs = computeConservativeMinSpecs(matchedWorkloads);
          specs.os_requirement = profile.os_requirement || specs.os_requirement;

          const enriched = await enrichSpecsWithComponentExamples(specs);
          const summary = formatSpecsInline(enriched, { includeScores });
          lines.push(`${profile.software_name}: ${summary || "No minimum specs found."}`);
        }

        const disclaimer =
          "Note: minimum specs are the floor - bigger projects can still feel slow. If you can, aim above them.";
        const answer = lines.length
          ? `${lines.join("\n")}\n\n${disclaimer}`
          : "I don't have minimum specs for that yet.";

        return c.json(
          {
            answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
            ...(debug
              ? {
                  meta: {
                    version: SUPPORT_BOT_VERSION,
                    path: "direct-requirements-multi",
                    softwareKeys: plan.softwareKeys,
                  },
                }
              : {}),
          },
          200,
        );
      }

      const selectedWorkloads: WorkloadRequirement[] = [];

      for (const key of plan.softwareKeys) {
        const profile = softwareProfiles.find((p) => p.software_key === key);
        if (!profile) continue;
        const required = asStringArray(profile.required_workloads);
        for (const wlName of required) {
          const w = workloadProfiles.find((x) => x.workload_name === wlName);
          if (w) selectedWorkloads.push(w);
        }
      }

      for (const name of plan.workloadNames) {
        const w = workloadProfiles.find((x) => x.workload_name === name);
        if (w) selectedWorkloads.push(w);
      }

      // If they asked for "safest specs" and we don't have a precise match, use a conservative baseline.
      if (selectedWorkloads.length === 0) {
        const baselineNames = ["Office Productivity", "Remote Work & VPN"];
        for (const n of baselineNames) {
          const w = workloadProfiles.find((x) => x.workload_name === n);
          if (w) selectedWorkloads.push(w);
        }
      }

      if (selectedWorkloads.length > 0) {
        const specs = computeConservativeMinSpecs(selectedWorkloads);
        const enriched = await enrichSpecsWithComponentExamples(specs);
        const body = formatMinSpecsForUser(enriched, { includeScores });
        const disclaimer =
          "Note: minimum specs are the floor—bigger projects can still feel slow. If you can, aim above them.";
        const answer = body
          ? `Safest minimum specs:\n${body}\n\n${disclaimer}`
          : "I don't have minimum specs for that yet.";

        return c.json(
          {
            answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
            ...(debug
              ? {
                  meta: {
                    version: SUPPORT_BOT_VERSION,
                    path: "direct-requirements",
                    softwareKeys: plan.softwareKeys,
                    workloadNames: plan.workloadNames,
                  },
                }
              : {}),
          },
          200,
        );
      }
    }

    // Fast path: upgrade advice (avoid LLM timeouts and avoid looping on clarifiers).
    if (wantsUpgradeAdvice(message)) {
      const answer =
        "If you can afford it, yes: 16 GB RAM is usually the safer pick than 8 GB for Windows (smoother multitasking and more headroom). " +
        "If you’re only doing light browsing/docs, 8 GB can work, but 16 GB tends to age better.";

      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "upgrade-advice" } } : {}),
        },
        200,
      );
    }

    // Fast path: "How much RAM do I need?" (use selected workloads if present; no Ollama).
    if (isRamQuestion(message) && !wantsRequirementsAnswer(message)) {
      const selectedNames =
        plan.workloadNames.length > 0
          ? plan.workloadNames
          : (() => {
              // Try to infer from UI CONTEXT system message if present.
              const ui = history.find(
                (m) => m.role === "system" && typeof m.content === "string" && m.content.startsWith("UI CONTEXT"),
              )?.content;
              const match = ui?.match(/User workloads:\s*([^\.]+)\./i)?.[1]?.trim();
              if (!match) return [];
              return match.split(",").map((s) => s.trim()).filter(Boolean);
            })();

      const selectedWorkloads = selectedNames
        .map((n) => workloadProfiles.find((w) => w.workload_name === n))
        .filter(Boolean) as WorkloadRequirement[];

      const specs = computeConservativeMinSpecs(selectedWorkloads);
      const min = typeof specs.ram_gb === "number" ? specs.ram_gb : null;

      const answer = selectedWorkloads.length
        ? `For your selected workloads, the minimum RAM is ${min ?? "unknown"} GB. If you can, 16 GB is the safer pick for Windows.`
        : "For typical college use, 16 GB RAM is the safer pick. 8 GB is the minimum for lighter tasks, but it can feel tight with lots of tabs + video calls.";

      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "ram-fast", workloads: selectedNames } } : {}),
        },
        200,
      );
    }

    // Fast path: generic "what should I upgrade / spend more on".
    if (
      wantsTradeoffAdvice(message) &&
      (/\bspecs?\b/.test(message.toLowerCase()) ||
        /\bupgrade\b/.test(message.toLowerCase()) ||
        /\bbetter\b/.test(message.toLowerCase()))
    ) {
      const keys = plan.softwareKeys.slice(0, 2);
      const names = keys
        .map((k) => softwareProfiles.find((p) => p.software_key === k)?.software_name || k)
        .filter(Boolean);

      if (names.length) {
        const workloads: WorkloadRequirement[] = [];
        for (const k of keys) {
          const profile = softwareProfiles.find((p) => p.software_key === k);
          if (!profile) continue;
          for (const wlName of asStringArray(profile.required_workloads)) {
            const w = workloadProfiles.find((x) => x.workload_name === wlName);
            if (w) workloads.push(w);
          }
        }

        const specs = computeConservativeMinSpecs(workloads);
        const needsGpu = String(specs.gpu_type || "").toLowerCase() === "discrete";

        const answer =
          `For ${names.join(" and ")}, prioritize ` +
          (needsGpu ? "a dedicated GPU, then " : "") +
          "RAM (16 GB+), then SSD (512 GB), then CPU. " +
          "What's your budget?";

        return c.json(
          {
            answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
            ...(debug
              ? { meta: { version: SUPPORT_BOT_VERSION, path: "tradeoff-advice-targeted", softwareKeys: keys } }
              : {}),
          },
          200,
        );
      }

      const answer =
        "If you want a little better than minimum, prioritize:\n" +
        "- 16 GB RAM\n" +
        "- 512 GB SSD\n" +
        "- then a better CPU\n" +
        "A dedicated GPU mainly matters for 3D CAD/3D rendering, video editing, and gaming.\n" +
        "What software (or major) are you buying it for?";

      return c.json(
        {
          answer: SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(answer, SUPPORT_CHAT_MAX_CHARS) : answer,
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "tradeoff-advice" } } : {}),
        },
        200,
      );
    }

    if (plan.mode === "clarify" && plan.clarifyingQuestions.length) {
      const questions = plan.clarifyingQuestions.slice(0, 3);
      const answerRaw =
        questions.length === 1
          ? questions[0]!
          : "Quick questions so I can help:\n- " + questions.join("\n- ");
      const answer =
        SUPPORT_CHAT_MAX_CHARS > 0
          ? truncateHard(answerRaw, SUPPORT_CHAT_MAX_CHARS)
          : answerRaw;

      return c.json(
        {
          answer,
          ...(debug
            ? {
                meta: {
                  version: SUPPORT_BOT_VERSION,
                  path: "clarify",
                  searchQuery: plan.searchQuery,
                  needsRetrieval: plan.needsRetrieval,
                  softwareKeys: plan.softwareKeys,
                  workloadNames: plan.workloadNames,
                  clarifyingQuestions: questions,
                },
              }
            : {}),
        },
        200,
      );
    }

    if (!plan.searchQuery) {
      return c.json(
        {
          answer:
            "What software are you asking about (and what OS are you on: Windows or macOS)?",
          ...(debug
            ? { meta: { version: SUPPORT_BOT_VERSION, path: "no-question" } }
            : {}),
        },
        200,
      );
    }

    let sourcesToUse: any[] = [];
    let bestSimilarity: number | undefined = undefined;

    if (plan.needsRetrieval) {
      const embedding = await ollama.embed(plan.searchQuery);
      if (!embedding || !Array.isArray(embedding)) {
        return c.json(
          {
            answer: transientAnswer(),
            ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "embed-failed" } } : {}),
          },
          200,
        );
      }

      const sources = await withDbRetry(() =>
        knowledgeRepo.searchByEmbedding({
          embedding: embedding as number[],
          limit: topK,
        }),
      );

      const minSimilarity = Number.parseFloat(process.env.RAG_MIN_SIMILARITY ?? "0.35");
      const bestDistance = sources[0]?.distance;
      bestSimilarity = typeof bestDistance === "number" ? 1 - bestDistance : undefined;

      // If retrieval looks irrelevant, treat it as "no grounded info" instead of letting the LLM guess.
      const usableSources =
        sources.length > 0 &&
        (bestSimilarity == null ||
          !Number.isFinite(minSimilarity) ||
          bestSimilarity >= minSimilarity);

      sourcesToUse = usableSources ? sources : [];
    }

    const extraNotes: string[] = [];
    const seen = new Set<string>();

    for (const key of plan.softwareKeys) {
      const profile = softwareProfiles.find((p) => p.software_key === key);
      if (!profile) continue;
      const k = `swKey:${key}`;
      if (seen.has(k)) continue;
      seen.add(k);
      extraNotes.push(renderSoftwareNote(profile, workloadProfiles));
    }

    for (const name of plan.workloadNames) {
      const workload = workloadProfiles.find((w) => w.workload_name === name);
      if (!workload) continue;
      const k = `wlName:${name}`;
      if (seen.has(k)) continue;
      seen.add(k);
      extraNotes.push(renderWorkloadNote(workload));
    }

    for (const s of sourcesToUse) {
      const parsed = parseDbSourceUri(s.source_uri);
      if (!parsed) continue;

      if (parsed.table === "software_requirements") {
        const profile = softwareProfiles.find((p) => p.id === parsed.id);
        if (!profile) continue;
        const k = `swId:${profile.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        extraNotes.push(renderSoftwareNote(profile, workloadProfiles));
      }

      if (parsed.table === "workload_requirements") {
        const workload = workloadProfiles.find((w) => w.id === parsed.id);
        if (!workload) continue;
        const k = `wlId:${workload.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        extraNotes.push(renderWorkloadNote(workload));
      }
    }

    const extraNotesBlock = joinWithLimit(
      extraNotes,
      "\n\n-----\n\n",
      RAG_MAX_EXTRA_CONTEXT_CHARS,
    );

    const sourcesBlock = joinWithLimit(
      sourcesToUse.map((s) => sanitizeForContext(truncate(s.content, 1400))),
      "\n\n-----\n\n",
      Math.max(0, RAG_MAX_CONTEXT_CHARS - extraNotesBlock.length),
    );

    const notesBlock = [extraNotesBlock, sourcesBlock].filter(Boolean).join("\n\n-----\n\n").trim();

    if (!notesBlock) {
      return c.json(
        {
          answer:
            "I'm not finding that in our current compatibility info. What software (and version) is it, and are you on Windows or macOS?",
          ...(debug
            ? {
                meta: {
                  version: SUPPORT_BOT_VERSION,
                  path: "no-notes",
                  searchQuery: plan.searchQuery,
                  softwareKeys: plan.softwareKeys,
                  workloadNames: plan.workloadNames,
                  bestSimilarity,
                },
              }
            : {}),
        },
        200,
      );
    }

    const system: any = {
      role: "system",
      content:
        "You are a laptop/software compatibility support bot. " +
        "Use conversation HISTORY only to understand follow-ups; do not treat HISTORY as factual source material. " +
        "You may use UI CONTEXT (if present in HISTORY) as the user's current selections (budget/workloads/etc). " +
        "Use INTERNAL CONTEXT as the only source of truth for compatibility and requirements. Do not use general knowledge. " +
        "Answer the user's latest message. If the latest message changes topic, ignore earlier topic details. " +
        "Prefer asking 1-3 short follow-up questions over giving a long answer when the request is broad or ambiguous. " +
        "If the user asks for a definition or comparison of terms, answer in 1-3 short sentences. " +
        "Do not list detailed specs unless the user asked for requirements/specs/minimums, or you've already clarified the use-case. " +
        "Ask a short follow-up question when needed (software name/version, OS, use-case details). " +
        "Do not mention internal context, notes, sources, documents, ingestion, embeddings, or databases. " +
        "Do not tell the user to add documents. " +
        `Keep the tone friendly and concise; keep replies under ${SUPPORT_CHAT_MAX_CHARS} characters (unless the user explicitly asks for more). ` +
        "Use 1-6 short sentences or a short bullet list. " +
        "If INTERNAL CONTEXT is missing or doesn't contain the answer, say you can't find it in current compatibility info and ask what you need to proceed.",
    };

    const notesMsg: any = {
      role: "system",
      content:
        "INTERNAL CONTEXT (do not mention in your reply):\n\n" + notesBlock,
    };

    const historyText = formatHistoryForRewrite(history, 10);
    const historyMsg: any = historyText
      ? {
          role: "system",
          content:
            "HISTORY (for context only; do not quote; not a factual source):\n" +
            historyText,
        }
      : null;

    const answer = await ollama.chat([
      system,
      notesMsg,
      ...(historyMsg ? [historyMsg] : []),
      { role: "user", content: message },
    ]);
    if (!answer) {
      return c.json(
        {
          answer: transientAnswer(),
          ...(debug ? { meta: { version: SUPPORT_BOT_VERSION, path: "llm-failed" } } : {}),
        },
        200,
      );
    }

    const cleaned = cleanAssistantAnswer(answer) || answer.trim();
    const finalAnswer =
      SUPPORT_CHAT_MAX_CHARS > 0 ? truncateHard(cleaned, SUPPORT_CHAT_MAX_CHARS) : cleaned;

    if (!debug) return c.json({ answer: finalAnswer });

    return c.json({
      meta: {
        version: SUPPORT_BOT_VERSION,
        searchQuery: plan.searchQuery,
        needsRetrieval: plan.needsRetrieval,
        softwareKeys: plan.softwareKeys,
        workloadNames: plan.workloadNames,
        bestSimilarity,
      },
      answer: finalAnswer,
      sources: sourcesToUse.map((s) => ({
        source_uri: s.source_uri,
        title: s.title,
        chunk_index: s.chunk_index,
        distance: s.distance,
        excerpt: truncate(s.content, 380),
      })),
    });
  } catch (err: any) {
    console.error("[SupportChat] Error:", err?.message || err);
    if (isDbConnectionClosed(err)) {
      return c.json(
        {
          answer: transientAnswer("Sorry - I'm having trouble reaching the database right now. Please try again."),
        },
        200,
      );
    }
    return c.json({ answer: transientAnswer() }, 200);
  }
}
