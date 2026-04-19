// Read workloads passed forward
const params = new URLSearchParams(window.location.search);
const workloads = params.get("workloads") || "";
const major = params.get("major") || "";
const budgetParam = params.get("budget") || "any";
const sizeParam = params.get("size") || "any";
const bnParamRaw = params.get("bn") || "0";

function clampInt(n, lo, hi) {
  const x = Number.isFinite(n) ? Math.trunc(n) : lo;
  return Math.min(hi, Math.max(lo, x));
}

function money(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

function budgetMaxForPreset(value) {
  if (!value || value === "any") return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 2) return null;
  const hi = parts[1];
  return Number.isFinite(hi) ? hi : null;
}

let budgetNudgeSteps = clampInt(parseInt(bnParamRaw, 10) || 0, 0, 5);

function selectPreset(el) {
  const prev = document.querySelector(".preset.sel")?.dataset.value || "any";
  document.querySelectorAll(".preset").forEach((p) => p.classList.remove("sel"));
  el.classList.add("sel");

  const next = el.dataset.value || "any";
  if (next !== prev) budgetNudgeSteps = 0;
  updateBudgetNudgeUI();
}

function selectSize(el) {
  document
    .querySelectorAll(".size-card")
    .forEach((c) => c.classList.remove("sel"));
  el.classList.add("sel");
}

function isBudgetNudgeEnabled() {
  const budget = document.querySelector(".preset.sel")?.dataset.value || "any";
  return budget !== "any" && budget !== "2500-99999";
}

function ensureNudgeDots() {
  const dots = document.getElementById("nudgeDots");
  if (!dots || dots.children.length) return;
  for (let i = 0; i <= 5; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ndot";
    b.dataset.step = String(i);
    b.setAttribute("aria-label", `Set nudge to +${i * 10}%`);
    b.addEventListener("click", () => {
      budgetNudgeSteps = clampInt(i, 0, 5);
      updateBudgetNudgeUI();
    });
    dots.appendChild(b);
  }
}

function updateBudgetNudgeUI() {
  const row = document.getElementById("budgetNudgeRow");
  const minus = document.getElementById("nudgeMinus");
  const plus = document.getElementById("nudgePlus");
  const pct = document.getElementById("nudgePct");
  const dots = document.getElementById("nudgeDots");
  const ceiling = document.getElementById("nudgeCeiling");

  const enabled = isBudgetNudgeEnabled();
  if (row) row.style.display = enabled ? "block" : "none";
  if (!enabled) budgetNudgeSteps = 0;

  const bn = clampInt(budgetNudgeSteps, 0, 5);
  if (pct) pct.textContent = `+${bn * 10}%`;
  if (minus) minus.disabled = bn <= 0;
  if (plus) plus.disabled = bn >= 5;

  ensureNudgeDots();
  if (dots) {
    Array.from(dots.children).forEach((el) => {
      const i = clampInt(parseInt(el.dataset.step || "0", 10) || 0, 0, 5);
      el.classList.toggle("on", i > 0 && i <= bn);
    });
  }

  const budget = document.querySelector(".preset.sel")?.dataset.value || "any";
  const baseMax = budgetMaxForPreset(budget);
  if (ceiling) {
    if (baseMax == null) ceiling.textContent = "";
    else ceiling.textContent = `Current ceiling: ${money(baseMax * (1 + bn * 0.1))}`;
  }
}

// Wire up Back button to preserve workloads param
(() => {
  const qs = new URLSearchParams();
  if (workloads) qs.set("workloads", workloads);
  if (major) qs.set("major", major);
  document.querySelector(".btn-back-outline").href = `/workloads${qs.toString() ? "?" + qs.toString() : ""}`;
})();

function findLaptops() {
  const budget =
    document.querySelector(".preset.sel")?.dataset.value || "any";
  const size =
    document.querySelector(".size-card.sel")?.dataset.value || "any";

  const qs = new URLSearchParams();
  if (workloads) qs.set("workloads", workloads);
  qs.set("budget", budget);
  qs.set("size", size);
  if (budget !== "any" && budget !== "2500-99999" && budgetNudgeSteps > 0) {
    qs.set("bn", String(clampInt(budgetNudgeSteps, 0, 5)));
  }

  window.location.href = `/recommend?${qs.toString()}`;
}

// Initialize UI from query params
(function init() {
  const budgetEl = document.querySelector(`.preset[data-value="${budgetParam}"]`);
  if (budgetEl) selectPreset(budgetEl);
  else updateBudgetNudgeUI();

  const sizeEl = document.querySelector(`.size-card[data-value="${sizeParam}"]`);
  if (sizeEl) selectSize(sizeEl);

  // Apply bn from query param only if nudge is enabled for this preset.
  if (isBudgetNudgeEnabled()) {
    budgetNudgeSteps = clampInt(budgetNudgeSteps, 0, 5);
  } else {
    budgetNudgeSteps = 0;
  }

  const minus = document.getElementById("nudgeMinus");
  const plus = document.getElementById("nudgePlus");
  if (minus) minus.addEventListener("click", () => { budgetNudgeSteps -= 1; updateBudgetNudgeUI(); });
  if (plus) plus.addEventListener("click", () => { budgetNudgeSteps += 1; updateBudgetNudgeUI(); });

  updateBudgetNudgeUI();
})();

