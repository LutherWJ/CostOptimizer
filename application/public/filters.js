// Read workloads/software passed forward
const params = new URLSearchParams(window.location.search);
const workloads = params.get("workloads") || "";
const softwareParam = params.get("software") || "";
const budgetParam = params.get("budget") || "any";
const sizeParam = params.get("size") || "any";

const selectedSoftware = new Set(
  softwareParam
    ? softwareParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [],
);

function selectPreset(el) {
  document.querySelectorAll(".preset").forEach((p) => p.classList.remove("sel"));
  el.classList.add("sel");
}

function selectSize(el) {
  document
    .querySelectorAll(".size-card")
    .forEach((c) => c.classList.remove("sel"));
  el.classList.add("sel");
}

function toggleSoftware(el) {
  const key = el.dataset.key;
  if (!key) return;

  el.classList.toggle("sel");
  if (el.classList.contains("sel")) {
    selectedSoftware.add(key);
  } else {
    selectedSoftware.delete(key);
  }
}

// Wire up Back button to preserve workloads param
document.querySelector(".btn-back-outline").href = `/workloads${
  workloads ? "?workloads=" + encodeURIComponent(workloads) : ""
}`;

function findLaptops() {
  const budget =
    document.querySelector(".preset.sel")?.dataset.value || "any";
  const size =
    document.querySelector(".size-card.sel")?.dataset.value || "any";
  const software = Array.from(selectedSoftware).join(",");

  const qs = new URLSearchParams();
  if (workloads) qs.set("workloads", workloads);
  if (software) qs.set("software", software);
  qs.set("budget", budget);
  qs.set("size", size);

  window.location.href = `/recommend?${qs.toString()}`;
}

// Initialize UI from query params
(function init() {
  const budgetEl = document.querySelector(`.preset[data-value="${budgetParam}"]`);
  if (budgetEl) selectPreset(budgetEl);

  const sizeEl = document.querySelector(`.size-card[data-value="${sizeParam}"]`);
  if (sizeEl) selectSize(sizeEl);

  document.querySelectorAll(".swopt").forEach((el) => {
    const key = el.dataset.key;
    if (key && selectedSoftware.has(key)) {
      el.classList.add("sel");
    }
  });
})();

