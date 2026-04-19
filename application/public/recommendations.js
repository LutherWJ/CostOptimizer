// Sort for /recommend page

function pickSort(el) {
  document.querySelectorAll('.sbtn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');

  const grid = document.getElementById('recGrid');
  const cards = Array.from(grid.querySelectorAll('.rec-card'));

  // Fade out
  grid.style.opacity = '0';

  setTimeout(() => {
    const key = el.dataset.sort;
    cards.sort((a, b) => {
      if (key === 'price-asc')  return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
      if (key === 'price-desc') return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
      if (key === 'battery')    return parseFloat(b.dataset.battery) - parseFloat(a.dataset.battery);
      if (key === 'value')      return parseFloat(b.dataset.value)   - parseFloat(a.dataset.value);
      // default: best match (original DOM order stored in data-idx)
      return parseInt(a.dataset.idx) - parseInt(b.dataset.idx);
    });

    cards.forEach(c => grid.appendChild(c));

    // Re-apply .best to first non-hidden card
    const visible = cards.filter(c => !c.classList.contains('hidden'));
    cards.forEach(c => c.classList.remove('best'));
    if (visible.length) visible[0].classList.add('best');

    grid.style.opacity = '1';
  }, 130);
}

// Inline refine drawer for /recommend (Workloads / Budget / Screen)

function clampInt(n, lo, hi) {
  const x = Number.isFinite(n) ? Math.trunc(n) : lo;
  return Math.min(hi, Math.max(lo, x));
}

function money(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

function readInitFromShell(shell) {
  const wlCsv = shell?.dataset?.initWorkloads || "";
  const workloads = new Set(wlCsv ? wlCsv.split(",").map(s => s.trim()).filter(Boolean) : []);
  const budget = shell?.dataset?.initBudget || "any";
  const size = shell?.dataset?.initSize || "any";
  const bn = clampInt(parseInt(shell?.dataset?.initBn || "0", 10) || 0, 0, 5);
  return { workloads, budget, size, bn };
}

function clonePrefState(s) {
  return { workloads: new Set(Array.from(s.workloads)), budget: s.budget, size: s.size, bn: s.bn };
}

function budgetMaxForPreset(value) {
  if (!value || value === "any") return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 2) return null;
  const hi = parts[1];
  return Number.isFinite(hi) ? hi : null;
}

function budgetLabelForPreset(value) {
  const el = document.querySelector(`#budgetPresets .preset[data-value="${value}"]`);
  if (el) return (el.textContent || "").trim();
  if (value === "any") return "No limit";
  if (value === "2500-99999") return "$2.5k+";
  return "Budget";
}

function sizeLabelForValue(value) {
  const el = document.querySelector(`#sizeCards .size-card[data-value="${value}"] .s-title`);
  if (el) return (el.textContent || "").trim();
  return "Any Size";
}

function setSortBestMatchUI() {
  const matchBtn = document.querySelector('.sbtn[data-sort="match"]');
  if (!matchBtn) return;
  document.querySelectorAll('.sbtn').forEach(b => b.classList.toggle('on', b === matchBtn));
}

function buildFiltersUrlFromApplied(applied) {
  const filtersQs = new URLSearchParams();
  const workloadsCsv = Array.from(applied.workloads || []).join(",");
  if (workloadsCsv) filtersQs.set("workloads", workloadsCsv);
  filtersQs.set("budget", applied.budget || "any");
  filtersQs.set("size", applied.size || "any");
  if (applied.budget !== "any" && applied.budget !== "2500-99999" && applied.bn > 0) {
    filtersQs.set("bn", String(clampInt(applied.bn, 0, 5)));
  }
  return `/filters?${filtersQs.toString()}`;
}

function syncEditPrefsLinks(applied) {
  const href = buildFiltersUrlFromApplied(applied);
  document.querySelectorAll("a.btn-editprefs").forEach((a) => a.setAttribute("href", href));

  // Results page nav back arrow should go to current prefs, not the original server-rendered URL.
  const prev = document.querySelector('.nav-pager .nav-arrow[data-dir="prev"]');
  if (prev) prev.dataset.href = href;
}

function closePrefDrawer() {
  const shell = document.getElementById("refineShell");
  const drawer = document.getElementById("prefDrawer");
  if (!shell || !drawer) return;
  shell.classList.remove("open");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.querySelectorAll(".pref-tag").forEach(t => t.classList.remove("on"));
  document.querySelectorAll(".ptab").forEach(t => t.classList.remove("on"));
  document.querySelectorAll(".ppanel").forEach(p => p.classList.remove("show"));
  shell.dataset.activeTab = "";
}

function openPrefDrawer(tab) {
  const shell = document.getElementById("refineShell");
  const drawer = document.getElementById("prefDrawer");
  if (!shell || !drawer) return;

  // Only allow tabs that actually exist in the DOM (Workloads was removed from results page).
  if (!document.querySelector(`.ppanel[data-tab="${tab}"]`)) tab = "budget";

  // If drawer was closed, sync draft from applied/global state.
  if (!shell.classList.contains("open")) {
    window.__prefApplied = window.__prefApplied || readInitFromShell(shell);
    window.__prefDraft = clonePrefState(window.__prefApplied);
    syncPrefUIFromDraft();
  }

  shell.classList.add("open");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  shell.dataset.activeTab = tab;

  const tagMap = {
    workloads: document.getElementById("prefTagWorkloads"),
    budget: document.getElementById("prefTagBudget"),
    screen: document.getElementById("prefTagScreen"),
  };

  Object.entries(tagMap).forEach(([k, el]) => {
    if (!el) return;
    el.classList.toggle("on", k === tab);
  });

  document.querySelectorAll(".ptab").forEach((b) => {
    b.classList.toggle("on", b.dataset.tab === tab);
  });
  document.querySelectorAll(".ppanel").forEach((p) => {
    p.classList.toggle("show", p.dataset.tab === tab);
  });

  updatePrefBarTags();
}

function togglePrefDrawer(tab) {
  const shell = document.getElementById("refineShell");
  if (!shell) return;
  const active = shell.dataset.activeTab || "";
  if (shell.classList.contains("open") && active === tab) {
    closePrefDrawer();
    updatePrefBarTags();
    return;
  }
  openPrefDrawer(tab);
}

function setDraftBudget(value) {
  window.__prefDraft.budget = value;
  window.__prefDraft.bn = 0;
  syncPrefUIFromDraft();
}

function setDraftSize(value) {
  window.__prefDraft.size = value;
  syncPrefUIFromDraft();
}

function setDraftNudgeSteps(steps) {
  window.__prefDraft.bn = clampInt(steps, 0, 5);
  syncPrefUIFromDraft();
}

function setDraftWorkloadToggle(id) {
  if (!id) return;
  if (window.__prefDraft.workloads.has(id)) window.__prefDraft.workloads.delete(id);
  else window.__prefDraft.workloads.add(id);
  syncPrefUIFromDraft(true);
}

function syncPrefUIFromDraft(skipPanelVisibility) {
  const shell = document.getElementById("refineShell");
  if (!shell || !window.__prefDraft) return;

  // Workloads
  document.querySelectorAll(".wl-mini").forEach((btn) => {
    const id = btn.dataset.id;
    const on = !!id && window.__prefDraft.workloads.has(id);
    btn.classList.toggle("sel", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });

  // Budget preset selection
  document.querySelectorAll("#budgetPresets .preset").forEach((p) => {
    p.classList.toggle("sel", p.dataset.value === window.__prefDraft.budget);
  });

  // Screen size selection
  document.querySelectorAll("#sizeCards .size-card").forEach((c) => {
    c.classList.toggle("sel", c.dataset.value === window.__prefDraft.size);
  });

  // Nudge: show/hide and update controls
  const nudgeRow = document.getElementById("budgetNudgeRow");
  const nudgeDots = document.getElementById("nudgeDots");
  const nudgePct = document.getElementById("nudgePct");
  const nudgeCeiling = document.getElementById("nudgeCeiling");
  const minus = document.getElementById("nudgeMinus");
  const plus = document.getElementById("nudgePlus");

  const nudgable = window.__prefDraft.budget !== "any" && window.__prefDraft.budget !== "2500-99999";
  if (nudgeRow) nudgeRow.style.display = nudgable ? "block" : "none";
  if (!nudgable) window.__prefDraft.bn = 0;

  const bn = clampInt(window.__prefDraft.bn, 0, 5);
  if (nudgePct) nudgePct.textContent = `+${bn * 10}%`;

  const baseMax = budgetMaxForPreset(window.__prefDraft.budget);
  if (nudgeCeiling) {
    if (baseMax == null) nudgeCeiling.textContent = "";
    else nudgeCeiling.textContent = `Current ceiling: ${money(baseMax * (1 + bn * 0.1))}`;
  }

  if (minus) minus.disabled = bn <= 0;
  if (plus) plus.disabled = bn >= 5;

  if (nudgeDots && nudgeDots.children.length === 0) {
    for (let i = 0; i <= 5; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ndot";
      b.dataset.step = String(i);
      b.setAttribute("aria-label", `Set nudge to +${i * 10}%`);
      b.addEventListener("click", () => setDraftNudgeSteps(i));
      nudgeDots.appendChild(b);
    }
  }
  if (nudgeDots) {
    Array.from(nudgeDots.children).forEach((el) => {
      const i = clampInt(parseInt(el.dataset.step || "0", 10) || 0, 0, 5);
      el.classList.toggle("on", i > 0 && i <= bn);
    });
  }

  if (!skipPanelVisibility) {
    const tab = shell.dataset.activeTab || "";
    if (tab) {
      document.querySelectorAll(".ptab").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
      document.querySelectorAll(".ppanel").forEach((p) => p.classList.toggle("show", p.dataset.tab === tab));
    }
  }

  updatePrefBarTags();
}

async function applyPrefDrawer() {
  const shell = document.getElementById("refineShell");
  if (!shell || !window.__prefDraft) return;

  // Sync into global state if it exists (per spec).
  if (window.selectedWLs instanceof Set) {
    window.selectedWLs.clear();
    window.__prefDraft.workloads.forEach((id) => window.selectedWLs.add(id));
  }
  if (typeof window.budgetNudgeSteps === "number") {
    window.budgetNudgeSteps = window.__prefDraft.bn;
  }

  window.__prefApplied = clonePrefState(window.__prefDraft);
  syncEditPrefsLinks(window.__prefApplied);

  closePrefDrawer();
  updatePrefBarTags();

  // Reset sort UI to best match before re-render.
  setSortBestMatchUI();

  // Preferred path: if app-provided match/render functions exist, call them.
  // Fallback: fetch updated /recommend HTML and fade-swap relevant DOM sections.
  const hasClientRerender =
    typeof window.matchLaptops === "function" &&
    typeof window.renderCards === "function" &&
    typeof window.showResults === "function";

  if (hasClientRerender) {
    try {
      // The actual app implements these; we just orchestrate.
      const arr = window.matchLaptops();
      const grid = document.getElementById("recGrid");
      if (grid) grid.style.opacity = "0";
      setTimeout(() => {
        window.renderCards(arr);
        window.showResults();
        setSortBestMatchUI();
        syncEditPrefsLinks(window.__prefApplied);
      }, 140);
      return;
    } catch (e) {
      // Fall through to fetch approach.
      console.warn("Inline refine: client rerender failed, falling back to fetch", e);
    }
  }

  const qs = new URLSearchParams(window.location.search);
  const workloadsCsv = Array.from(window.__prefApplied.workloads).join(",");
  if (workloadsCsv) qs.set("workloads", workloadsCsv);
  else qs.delete("workloads");

  qs.set("budget", window.__prefApplied.budget || "any");
  qs.set("size", window.__prefApplied.size || "any");
  if (window.__prefApplied.bn > 0) qs.set("bn", String(window.__prefApplied.bn));
  else qs.delete("bn");

  const url = `/recommend?${qs.toString()}`;
  const grid = document.getElementById("recGrid");
  if (grid) grid.style.opacity = "0";

  try {
    const res = await fetch(url, { headers: { "X-Requested-With": "fetch" } });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const newGrid = doc.getElementById("recGrid");
    const newResCount = doc.getElementById("resCount");
    const newResSub = doc.getElementById("resSub");

    setTimeout(() => {
      if (newResCount && document.getElementById("resCount")) {
        document.getElementById("resCount").textContent = (newResCount.textContent || "").trim();
      }
      if (newResSub && document.getElementById("resSub")) {
        document.getElementById("resSub").textContent = (newResSub.textContent || "").trim();
      }
      if (newGrid && grid) {
        grid.innerHTML = newGrid.innerHTML;
      }

      // Clear any previous hidden flags.
      document.querySelectorAll(".rec-card.hidden").forEach((c) => c.classList.remove("hidden"));

      if (grid) grid.style.opacity = "1";
      setSortBestMatchUI();
      updatePrefBarTags();
      syncEditPrefsLinks(window.__prefApplied);

      // Keep URL in sync without a full reload.
      window.history.replaceState({}, "", `/recommend?${qs.toString()}`);
    }, 150);
  } catch (e) {
    console.warn("Inline refine: fetch apply failed", e);
    if (grid) grid.style.opacity = "1";
  }
}

function updatePrefBarTags() {
  const shell = document.getElementById("refineShell");
  if (!shell) return;

  const open = shell.classList.contains("open");
  const s = open && window.__prefDraft ? window.__prefDraft : (window.__prefApplied || readInitFromShell(shell));

  const wlVal = document.getElementById("prefWorkloadsVal");
  const bVal = document.getElementById("prefBudgetVal");
  const scVal = document.getElementById("prefScreenVal");

  if (wlVal) wlVal.textContent = `${s.workloads.size}`;

  if (bVal) {
    const lbl = budgetLabelForPreset(s.budget);
    const pct = s.bn > 0 ? ` +${s.bn * 10}%` : "";
    bVal.textContent = `${lbl}${pct}`;
  }

  if (scVal) scVal.textContent = sizeLabelForValue(s.size);
}

(function initInlineRefineDrawer() {
  const shell = document.getElementById("refineShell");
  if (!shell) return;

  window.__prefApplied = readInitFromShell(shell);
  window.__prefDraft = clonePrefState(window.__prefApplied);

  // If the app already has these globals, mirror from server state on load.
  if (window.selectedWLs instanceof Set) {
    window.selectedWLs.clear();
    window.__prefApplied.workloads.forEach((id) => window.selectedWLs.add(id));
  } else {
    // Provide a Set for code paths that expect it.
    window.selectedWLs = window.selectedWLs || new Set(Array.from(window.__prefApplied.workloads));
  }
  if (typeof window.budgetNudgeSteps !== "number") {
    window.budgetNudgeSteps = window.__prefApplied.bn;
  }

  // Wire clicks (we avoid inline handlers here so swaps don't duplicate listeners).
  document.querySelectorAll("#budgetPresets .preset").forEach((p) => {
    p.addEventListener("click", () => setDraftBudget(p.dataset.value || "any"));
  });
  document.querySelectorAll("#sizeCards .size-card").forEach((c) => {
    c.addEventListener("click", () => setDraftSize(c.dataset.value || "any"));
  });
  document.querySelectorAll(".wl-mini").forEach((btn) => {
    btn.addEventListener("click", () => setDraftWorkloadToggle(btn.dataset.id || ""));
  });

  const minus = document.getElementById("nudgeMinus");
  const plus = document.getElementById("nudgePlus");
  if (minus) minus.addEventListener("click", () => setDraftNudgeSteps((window.__prefDraft.bn || 0) - 1));
  if (plus) plus.addEventListener("click", () => setDraftNudgeSteps((window.__prefDraft.bn || 0) + 1));

  // Close on outside click / escape
  document.addEventListener("click", (e) => {
    const open = shell.classList.contains("open");
    if (!open) return;
    const t = e.target;
    if (t instanceof Element && shell.contains(t)) return;
    closePrefDrawer();
    updatePrefBarTags();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!shell.classList.contains("open")) return;
    closePrefDrawer();
    updatePrefBarTags();
  });

  // If showResults exists, ensure post-run housekeeping.
  if (typeof window.showResults === "function" && !window.__prefShowResultsPatched) {
    const orig = window.showResults;
    window.showResults = function (...args) {
      const r = orig.apply(this, args);
      try { updatePrefBarTags(); closePrefDrawer(); } catch {}
      return r;
    };
    window.__prefShowResultsPatched = true;
  }

  // Initialize UI
  syncPrefUIFromDraft();
  updatePrefBarTags();
  syncEditPrefsLinks(window.__prefApplied);
})();

// Export a few functions used by inline onclick attributes in the template.
window.openPrefDrawer = openPrefDrawer;
window.togglePrefDrawer = togglePrefDrawer;
window.closePrefDrawer = closePrefDrawer;
window.applyPrefDrawer = applyPrefDrawer;
window.updatePrefBarTags = updatePrefBarTags;
// Back-compat with the naming in the feature spec.
window.closeDrawer = closePrefDrawer;
