import Base from "./Base";
import type { LaptopRecommendation } from "../models/laptopRecommendationsModel";

// Maps short workload IDs to display labels for the pill bar
const WORKLOAD_LABELS: Record<string, string> = {
  daily:      "Daily Browsing",
  stream:     "Streaming",
  writing:    "Writing & Study",
  casual2d:   "Casual 2D Games",
  office:     "Office Productivity",
  finance:    "Finance",
  research:   "Research & Analytics",
  remote:     "Remote Work & VPN",
  erp:        "ERP Systems",
  design:     "Photo & Design",
  video:      "Video Editing",
  music:      "Music Production",
  content:    "Content Creation",
  render3d:   "VFX & 3D Rendering",
  webdev:     "Web Development",
  datasci:    "Data Science",
  cyber:      "Cybersecurity",
  ml:         "Machine Learning",
  gamedev:    "Game Development",
  cad:        "3D CAD / Modeling",
  arch:       "Architecture & BIM",
  science:    "Scientific Simulation",
  gis:        "GIS & Mapping",
  electrical: "Electrical / EDA",
  casual:     "Casual Gaming",
  esports:    "Esports",
  gaming:     "AAA Gaming",
  vr:         "VR Gaming",
};

// Windows-only workload names (inferred from os_requirement: "win")
const WIN_ONLY_WORKLOADS = new Set([
  "Office Productivity", "Finance", "Remote Work & VPN", "ERP Systems",
  "VFX & 3D Rendering", "Cybersecurity", "Game Development",
  "3D CAD / Modeling", "Architecture & BIM", "Scientific Simulation",
  "GIS & Mapping", "Electrical / EDA",
  "Casual Gaming", "Esports", "AAA Gaming", "VR Gaming",
]);

function formatStorage(gb: number): string {
  return gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`;
}

function shortGpu(name: string): string {
  return name
    .replace("NVIDIA GeForce ", "")
    .replace(" Laptop", "")
    .replace("Apple ", "");
}

function formatValueScore(score: number | null): string {
  if (!score) return "—";
  return Math.round(score).toString();
}

function renderCard(laptop: LaptopRecommendation, idx: number): string {
  const specs = laptop.hardware_specs;
  const isBest = idx === 0;
  const stoDisplay = formatStorage(specs.storage_gb);
  const battPct = Math.min((specs.battery_hours / 20) * 100, 100);
  const gpu = shortGpu(specs.gpu_model);
  const valueScore = formatValueScore(laptop.value_score);
  const condBadge = laptop.is_refurbished
    ? `<span class="rc-cond-badge rc-cond-ref">REFURB</span>`
    : `<span class="rc-cond-badge rc-cond-new">NEW</span>`;

  // Workloads this card supports (for pill filtering, comma-separated DB names)
  const workloadsAttr = (laptop.suitable_workloads || []).join(",").replace(/"/g, "&quot;");

  return `
    <div class="rec-card${isBest ? " best" : ""}"
      data-idx="${idx}"
      data-price="${laptop.current_price}"
      data-battery="${specs.battery_hours}"
      data-value="${laptop.value_score ?? 0}"
      data-workloads="${workloadsAttr}">

      <div class="rc-top">
        <div class="rc-title-block">
          <div class="rc-brand">${laptop.manufacturer}</div>
          <div class="rc-name">${
            laptop.marketing_name && laptop.marketing_name.toLowerCase() !== laptop.manufacturer.toLowerCase()
              ? laptop.marketing_name
              : (laptop.line_name && laptop.line_name.toLowerCase() !== laptop.manufacturer.toLowerCase()
                  ? laptop.line_name
                  : laptop.sku_number)
          }</div>
          <div class="rc-tagline">${specs.cpu_family} &middot; ${gpu}</div>
        </div>
        ${isBest ? `<div class="best-badge">Best match</div>` : ""}
      </div>

      <div class="rc-hero-row">
        <div class="value-score">${valueScore}</div>
        <div class="rc-hero-right">
          <div class="rc-price">
            $${Number(laptop.current_price).toLocaleString()}
            <span class="rc-price-note">starting</span>
            ${condBadge}
          </div>
          <div class="batt-row">
            <span class="batt-lbl">Battery</span>
            <div class="batt-track"><div class="batt-fill" style="width:${battPct}%"></div></div>
            <span class="batt-val">~${specs.battery_hours}h</span>
          </div>
        </div>
      </div>

      <div class="rc-specs-row">
        <div class="rsc"><b>${specs.cpu_family}</b></div>
        <div class="rsc"><b>${specs.ram_gb}&nbsp;GB</b> RAM</div>
        <div class="rsc"><b>${stoDisplay}</b> SSD</div>
        <div class="rsc"><b>${gpu}</b></div>
        <div class="rsc">${specs.screen_size_in}"</div>
      </div>

      <div class="rc-footer">
        <a class="btn-rc" href="${laptop.purchase_url}" target="_blank" rel="noopener">
          See on eBay &rarr;
        </a>
      </div>
    </div>`;
}

const Recommendations = (params: {
  laptops: LaptopRecommendation[];
  workloadIds: string[];
  budget: string;
  size: string;
  filtersUrl: string;
}) => {
  const { laptops, workloadIds, budget, size, filtersUrl } = params;

  // Build sub-header text
  const budgetLabel =
    budget === "any" || !budget ? "no limit" :
    budget === "0-600"          ? "under $600" :
    budget === "600-1000"       ? "$600–$1k" :
    budget === "1000-1500"      ? "$1k–$1.5k" :
    budget === "1500-2500"      ? "$1.5k–$2.5k" :
    budget === "2500-99999"     ? "$2.5k+" : "any budget";

  const sizeLabel =
    size === "compact"  ? "compact screen" :
    size === "standard" ? "standard screen" :
    size === "desktop"  ? "desktop screen" : "any screen size";

  const subText = `Budget: ${budgetLabel} · ${sizeLabel}`;

  // Workload pills
  const pillsHtml = workloadIds.length > 0
    ? workloadIds.map(id => {
        const label = WORKLOAD_LABELS[id] || id;
        return `<div class="rpill" data-workload="${label}" onclick="pickPill(this)"><div class="rdot"></div>${label}</div>`;
      }).join("")
    : "";

  // OS warning: show if any selected workload is Windows-only
  const selectedFullNames = workloadIds.map(id => WORKLOAD_LABELS[id]).filter(Boolean);
  const hasWinOnlyWorkload = selectedFullNames.some(n => WIN_ONLY_WORKLOADS.has(n));
  const osWarnClass = hasWinOnlyWorkload ? " show" : "";

  // Cards
  const cardsHtml = laptops.length > 0
    ? laptops.map((l, i) => renderCard(l, i)).join("")
    : `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <div style="font-size:28px;margin-bottom:12px;">&#x26A0;</div>
        <div style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:8px;">No laptops found</div>
        <div style="font-size:13px;color:#555;line-height:1.6;max-width:380px;margin:8px auto 0;">
          No recommendations match your filters. Try a wider budget, Any Size screen, or fewer demanding workloads.
        </div>
       </div>`;

  const content = `
    <nav>
      <a class="nav-logo" href="/">
        <span class="nav-dot"></span>LapTop
      </a>
      <div class="nav-right">
        <a class="nav-restart" href="${filtersUrl}">&#8592; Edit preferences</a>
      </div>
    </nav>

    <div class="results-page">

      <div class="results-header-row">
        <div class="res-title">Your recommendations</div>
        <div class="res-count">${laptops.length} laptop${laptops.length !== 1 ? "s" : ""} matched</div>
      </div>
      <div class="res-sub">${subText}</div>

      <div class="os-warn-banner${osWarnClass}">
        <span class="os-warn-icon">&#x1F6AB;</span>
        <div>
          <div class="os-warn-title">macOS excluded from your results</div>
          <div class="os-warn-text">Your selected workloads require Windows-only software. MacBooks have been removed from your results. This is one of the most common reasons students end up with an incompatible laptop.</div>
        </div>
      </div>

      ${workloadIds.length > 0 ? `
      <div class="workload-bar">
        <span class="wl-filter-label">Workloads</span>
        <div class="wl-filter-div"></div>
        <div class="rpill-group" id="wlPills">
          <div class="rpill on" data-workload="" onclick="pickPill(this)"><div class="rdot"></div>All workloads</div>
          ${pillsHtml}
        </div>
      </div>` : ""}

      <div class="p4-sort-row">
        <span class="sort-lbl">Sort by</span>
        <button class="sbtn on"  data-sort="match"      onclick="pickSort(this)">Best match</button>
        <button class="sbtn"     data-sort="price-asc"  onclick="pickSort(this)">Price: low–high</button>
        <button class="sbtn"     data-sort="price-desc" onclick="pickSort(this)">Price: high–low</button>
        <button class="sbtn"     data-sort="battery"    onclick="pickSort(this)">Battery life</button>
        <button class="sbtn"     data-sort="value"      onclick="pickSort(this)">Value score</button>
      </div>

      <div class="rec-grid" id="recGrid">
        ${cardsHtml}
      </div>

      <div class="pill-empty" id="pillEmpty">
        <div class="pill-empty-title">No results for this filter</div>
        <div class="pill-empty-sub">None of your matched laptops were flagged as a strong fit for this specific workload within your budget. Select "All workloads" to see all matches, or go back and widen your budget.</div>
      </div>

      <div class="p4-back-row">
        <a class="btn-back-outline" href="${filtersUrl}">&#8592; Adjust Preferences</a>
      </div>

    </div>`;

  return Base(content, "Your Recommendations — LapTop", ["/public/recommendations.css"], ["/public/recommendations.js"]);
};

export default Recommendations;
