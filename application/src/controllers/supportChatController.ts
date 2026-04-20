import type { Context } from "hono";

// NOTE: This controller must not import from `aggregator/`.
// The application VM deploy only includes `application/`.

const SUPPORT_BOT_VERSION = "2026-04-19-standalone-1";

type ChatMsg = { role?: string; content?: string };

function safeText(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function extractUiContext(history: unknown): string {
  if (!Array.isArray(history)) return "";
  const sys = history.find((m: any) => m && m.role === "system" && typeof m.content === "string" && m.content.startsWith("UI CONTEXT"));
  return sys && typeof (sys as any).content === "string" ? (sys as any).content : "";
}

function answerFromHeuristics(message: string, uiCtx: string): string {
  const t = message.toLowerCase();
  const ctx = uiCtx.toLowerCase();

  if (t.includes("mac") || t.includes("windows") || t.includes("os")) {
    const winHint =
      ctx.includes("cad") ||
      ctx.includes("revit") ||
      ctx.includes("solidworks") ||
      ctx.includes("arcgis") ||
      ctx.includes("examsoft") ||
      ctx.includes("respondus");

    if (winHint) {
      return [
        "For your selected workloads, Windows is the safer choice.",
        "A lot of school-required tools (CAD/BIM, some pro apps, many exam proctoring tools) are Windows-only or much smoother on Windows.",
        "If you already own a Mac, tell me the exact apps your program requires and I can sanity-check compatibility.",
      ].join(" ");
    }

    return [
      "If your program has Windows-only software requirements, pick Windows.",
      "If it is mostly web apps / writing / coding, either OS can work; then choose based on battery, build, and ecosystem.",
      "If you tell me the program or required software list, I can be more specific.",
    ].join(" ");
  }

  if (t.includes("ram") || t.includes("memory")) {
    return [
      "Rule of thumb:",
      "8GB works for basic browsing/writing, but it is getting tight.",
      "16GB is the best default for most students.",
      "32GB is for heavier workloads (ML, VMs, 3D/CAD, serious video work).",
      "If you share your workloads and budget, I can call the upgrade priorities.",
    ].join(" ");
  }

  if (t.includes("budget") || t.includes("price") || t.includes("overpay") || t.includes("nudge")) {
    return [
      "If you are just barely missing options, try nudging the budget ceiling in +10% steps on the results page to widen the pool.",
      "For value, prioritize CPU/RAM first for productivity and coding; prioritize GPU only for 3D/CAD/gaming/ML.",
      "Refurb can be a great deal if the seller has strong feedback and a return window.",
    ].join(" ");
  }

  if (t.includes("battery")) {
    return "Battery life varies a lot by CPU class and screen size. Tell me your top workloads plus your minimum hours target and I will suggest the best tradeoff.";
  }

  if (t.includes("gpu") || t.includes("graphics")) {
    return "If you do 3D/CAD, gaming, ML, or video editing, you likely want a discrete GPU. Otherwise, integrated graphics is usually fine and helps battery and price.";
  }

  // Default
  return [
    "Tell me your program/workloads and your budget ceiling, and I will recommend what to prioritize (CPU, RAM, GPU, storage, screen).",
    "If you have specific required software, list it and I will sanity-check compatibility.",
  ].join(" ");
}

export async function supportChatController(c: Context) {
  const body = await c.req.json().catch(() => null) as null | { message?: unknown; history?: unknown };
  const message = safeText(body?.message);
  const uiCtx = extractUiContext(body?.history);

  const answer = message
    ? answerFromHeuristics(message, uiCtx)
    : "Ask me about budget tradeoffs, priorities (CPU/RAM/GPU), or Mac vs Windows for your program.";

  return c.json({
    answer,
    meta: { version: SUPPORT_BOT_VERSION },
  });
}
