const selectedWLs = new Set();

const WL_STORAGE_KEY = "lapTop.selectedWorkloads";
const WL_MAJOR_STORAGE_KEY = "lapTop.selectedMajorPreset";

let selectedMajorPreset = "";

function readInitialWorkloadsCsv() {
  const qs = new URLSearchParams(window.location.search);
  if ((qs.get("reset") || "").trim() === "1") return "";
  const fromUrl = (qs.get("workloads") || "").trim();
  if (fromUrl) return fromUrl;
  try {
    return (sessionStorage.getItem(WL_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function readInitialMajorPreset() {
  const qs = new URLSearchParams(window.location.search);
  if ((qs.get("reset") || "").trim() === "1") return "";
  const fromUrl = (qs.get("major") || "").trim();
  if (fromUrl) return fromUrl;
  try {
    return (sessionStorage.getItem(WL_MAJOR_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function persistSelectedWorkloads() {
  const csv = Array.from(selectedWLs).join(",");

  // Session persistence
  try {
    if (csv) sessionStorage.setItem(WL_STORAGE_KEY, csv);
    else sessionStorage.removeItem(WL_STORAGE_KEY);

    if (selectedMajorPreset) sessionStorage.setItem(WL_MAJOR_STORAGE_KEY, selectedMajorPreset);
    else sessionStorage.removeItem(WL_MAJOR_STORAGE_KEY);
  } catch {}

  // URL persistence so browser back restores the selection.
  const qs = new URLSearchParams(window.location.search);
  if (csv) qs.set("workloads", csv);
  else qs.delete("workloads");
  if (selectedMajorPreset) qs.set("major", selectedMajorPreset);
  else qs.delete("major");
  const next = qs.toString();
  const url = next ? `${window.location.pathname}?${next}` : window.location.pathname;
  try { window.history.replaceState({}, "", url); } catch {}
}

function selectionMatchesPreset(key) {
  const ids = MAJOR_PRESETS[key] || [];
  if (ids.length !== selectedWLs.size) return false;
  for (const id of ids) {
    if (!selectedWLs.has(id)) return false;
  }
  return true;
}

function findMajorBtn(key) {
  // Avoid touching the template: infer key from inline onclick.
  const want = `applyMajor('${key}'`;
  const btns = Array.from(document.querySelectorAll(".fp-btn"));
  return btns.find((b) => String(b.getAttribute("onclick") || "").includes(want)) || null;
}

function syncMajorPresetUI() {
  document.querySelectorAll(".fp-btn.active").forEach((b) => b.classList.remove("active"));
  const reset = document.getElementById("fpReset");

  if (selectedMajorPreset) {
    const btn = findMajorBtn(selectedMajorPreset);
    if (btn) btn.classList.add("active");
    if (reset) reset.classList.add("show");
  } else {
    if (reset) reset.classList.remove("show");
  }
}

const MAJOR_PRESETS = {
  engineering:  ['cad','science','electrical','gis','research','writing','office'],
  nursing:      ['writing','research','remote','daily','stream','office'],
  business:     ['finance','erp','office','research','remote'],
  cs:           ['webdev','datasci','cyber','ml','gamedev'],
  design:       ['design','video','music','content'],
  architecture: ['arch','cad','render3d','gis'],
  humanities:   ['writing','research','daily','stream','office'],
  general:      ['daily','stream','writing','office'],
};

function toggleWL(el) {
  const id = el.dataset.id;
  el.classList.toggle('sel');
  if (selectedWLs.has(id)) {
    selectedWLs.delete(id);
  } else {
    selectedWLs.add(id);
  }

  // If user tweaks a major preset manually, clear the major selection badge.
  if (selectedMajorPreset && !selectionMatchesPreset(selectedMajorPreset)) {
    selectedMajorPreset = "";
    syncMajorPresetUI();
  }

  persistSelectedWorkloads();
  updateContinueBtn();
}

function updateContinueBtn() {
  const count = selectedWLs.size;
  const btn = document.getElementById('continueBtn');
  if (!btn) return;
  if (count === 0) {
    btn.disabled = true;
    btn.textContent = 'Select at least one workload';
  } else {
    btn.disabled = false;
    btn.textContent = `Continue with ${count} workload${count > 1 ? 's' : ''} \u2192`;
  }

  // Keep nav forward arrow in sync: enabled once at least one workload is selected.
  const next = document.querySelector('.nav-pager .nav-arrow[data-dir="next"]');
  if (next) {
    const on = count > 0;
    next.disabled = !on;
    next.setAttribute('aria-disabled', on ? 'false' : 'true');
  }
}

function applyMajor(key, btn) {
  // Clear all existing selections
  selectedWLs.clear();
  document.querySelectorAll('.wcard.sel').forEach(c => c.classList.remove('sel'));
  document.querySelectorAll('.fp-btn.active').forEach(b => b.classList.remove('active'));

  // Apply preset
  (MAJOR_PRESETS[key] || []).forEach(id => {
    selectedWLs.add(id);
    const card = document.querySelector(`.wcard[data-id="${id}"]`);
    if (card) card.classList.add('sel');
  });

  btn.classList.add('active');

  // Show reset button
  const reset = document.getElementById('fpReset');
  if (reset) reset.classList.add('show');

  selectedMajorPreset = key;
  persistSelectedWorkloads();
  updateContinueBtn();

  // Scroll to first group
  const firstGroup = document.querySelector('.wl-group');
  if (firstGroup) firstGroup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetMajor() {
  selectedWLs.clear();
  document.querySelectorAll('.wcard.sel').forEach(c => c.classList.remove('sel'));
  document.querySelectorAll('.fp-btn.active').forEach(b => b.classList.remove('active'));
  const reset = document.getElementById('fpReset');
  if (reset) reset.classList.remove('show');
  selectedMajorPreset = "";
  persistSelectedWorkloads();
  updateContinueBtn();
}

function goToFilters() {
  if (selectedWLs.size === 0) return;
  const qs = new URLSearchParams();
  qs.set("workloads", Array.from(selectedWLs).join(","));
  if (selectedMajorPreset) qs.set("major", selectedMajorPreset);
  window.location.href = `/filters?${qs.toString()}`;
}

(function initWorkloadsFromState() {
  const qs = new URLSearchParams(window.location.search);
  if ((qs.get("reset") || "").trim() === "1") {
    try {
      sessionStorage.removeItem(WL_STORAGE_KEY);
      sessionStorage.removeItem(WL_MAJOR_STORAGE_KEY);
    } catch {}

    // Drop the reset param from the URL immediately.
    try { window.history.replaceState({}, "", window.location.pathname); } catch {}
  }

  const csv = readInitialWorkloadsCsv();
  if (csv) {
    csv.split(",").map(s => s.trim()).filter(Boolean).forEach((id) => {
      selectedWLs.add(id);
      const card = document.querySelector(`.wcard[data-id="${id}"]`);
      if (card) card.classList.add("sel");
    });
  }

  const maybeMajor = readInitialMajorPreset();
  if (maybeMajor && MAJOR_PRESETS[maybeMajor] && selectionMatchesPreset(maybeMajor)) {
    selectedMajorPreset = maybeMajor;
  } else {
    selectedMajorPreset = "";
  }
  syncMajorPresetUI();

  // Ensure URL/session reflects the current in-memory selection (even if it came from storage).
  persistSelectedWorkloads();
  updateContinueBtn();
})();
