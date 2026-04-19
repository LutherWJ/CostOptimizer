import Base from "./Base";
import type { LaptopRecommendation } from "../models/laptopRecommendationsModel";

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

  return `
    <div class="rec-card${isBest ? " best" : ""}"
      data-idx="${idx}"
      data-price="${laptop.current_price}"
      data-battery="${specs.battery_hours}"
      data-value="${laptop.value_score ?? 0}">

      <div class="rc-top">
        <div class="rc-title-block">
          <div class="rc-brand">${laptop.manufacturer}</div>
          <div class="rc-name">${laptop.line_name}</div>
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
  budgetNudgeSteps?: number;
  filtersUrl: string;
}) => {
  const { laptops, workloadIds, budget, size, budgetNudgeSteps = 0, filtersUrl } = params;

  // Build sub-header text
  const budgetLabel =
    budget === "any" || !budget ? "no limit" :
    budget === "0-600"          ? "under $600" :
    budget === "600-1000"       ? "$600–$1k" :
    budget === "1000-1500"      ? "$1k–$1.5k" :
    budget === "1500-2500"      ? "$1.5k–$2.5k" :
    budget === "2500-99999"     ? "$2.5k+" : "any budget";

  const budgetTagLabel =
    budget === "any" || !budget ? "No limit" :
    budget === "0-600"          ? "Under $600" :
    budget === "600-1000"       ? "$600â€“$1k" :
    budget === "1000-1500"      ? "$1kâ€“$1.5k" :
    budget === "1500-2500"      ? "$1.5kâ€“$2.5k" :
    budget === "2500-99999"     ? "$2.5k+" : "Budget";

  const sizeLabel =
    size === "compact"  ? "compact screen" :
    size === "standard" ? "standard screen" :
    size === "desktop"  ? "desktop screen" : "any screen size";

  const screenTagLabel =
    size === "compact"  ? "Compact" :
    size === "standard" ? "Standard" :
    size === "desktop"  ? "Desktop" : "Any Size";

  const subText = `Budget: ${budgetLabel} · ${sizeLabel}`;

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
        <div class="nav-pager" aria-label="Page navigation">
          <button class="nav-arrow" type="button" data-dir="prev" data-href="${filtersUrl}" aria-label="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="nav-page-label">Results</div>
          <button class="nav-arrow" type="button" data-dir="next" disabled aria-disabled="true" aria-label="Next">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </nav>

    <div class="results-page">

      <div class="results-header-row">
        <div class="res-title">Your recommendations</div>
        <div class="res-count" id="resCount">${laptops.length} laptop${laptops.length !== 1 ? "s" : ""} matched</div>
      </div>
      <div class="res-sub" id="resSub">${subText}</div>

      <div class="refine-shell" id="refineShell"
        data-init-workloads="${workloadIds.join(",")}"
        data-init-budget="${budget}"
        data-init-size="${size}"
        data-init-bn="${budgetNudgeSteps}">

        <div class="refine-bar" id="prefBar">
          <button class="pref-tag" id="prefTagWorkloads" type="button" onclick="togglePrefDrawer('workloads')">
            <span class="pref-k">Workloads</span>
            <span class="pref-v" id="prefWorkloadsVal">${workloadIds.length}</span>
          </button>
          <button class="pref-tag" id="prefTagBudget" type="button" onclick="togglePrefDrawer('budget')">
            <span class="pref-k">Budget</span>
            <span class="pref-v" id="prefBudgetVal">${budgetTagLabel}${budgetNudgeSteps > 0 ? ` +${budgetNudgeSteps * 10}%` : ""}</span>
          </button>
          <button class="pref-tag" id="prefTagScreen" type="button" onclick="togglePrefDrawer('screen')">
            <span class="pref-k">Screen</span>
            <span class="pref-v" id="prefScreenVal">${screenTagLabel}</span>
          </button>
        </div>

        <div class="refine-drawer" id="prefDrawer" aria-hidden="true">
          <div class="refine-drawer-inner">
            <div class="pref-drawer-top">
              <div class="pref-tabs" role="tablist" aria-label="Refine results">
                <button class="ptab" type="button" data-tab="workloads" onclick="openPrefDrawer('workloads')" role="tab">Workloads</button>
                <button class="ptab" type="button" data-tab="budget" onclick="openPrefDrawer('budget')" role="tab">Budget</button>
                <button class="ptab" type="button" data-tab="screen" onclick="openPrefDrawer('screen')" role="tab">Screen</button>
              </div>
              <button class="pref-apply" id="prefApply" type="button" onclick="applyPrefDrawer()">Apply &#10003;</button>
            </div>

            <div class="pref-panels">
              <div class="ppanel" data-tab="workloads" role="tabpanel">
                <div class="wl-mini-wrap" id="wlMiniWrap">
                  <div class="wl-mini-group">
                    <div class="wl-mini-head">Everyday</div>
                    <div class="wl-mini-grid">
                      <button class="wl-mini" type="button" data-id="daily">daily<div class="wl-mini-lbl">Daily</div></button>
                      <button class="wl-mini" type="button" data-id="stream">stream<div class="wl-mini-lbl">Streaming</div></button>
                      <button class="wl-mini" type="button" data-id="writing">writing<div class="wl-mini-lbl">Writing</div></button>
                      <button class="wl-mini" type="button" data-id="casual2d">casual2d<div class="wl-mini-lbl">Casual 2D</div></button>
                    </div>
                  </div>

                  <div class="wl-mini-group">
                    <div class="wl-mini-head">Office</div>
                    <div class="wl-mini-grid">
                      <button class="wl-mini" type="button" data-id="office">office<div class="wl-mini-lbl">Office</div></button>
                      <button class="wl-mini" type="button" data-id="finance">finance<div class="wl-mini-lbl">Finance</div></button>
                      <button class="wl-mini" type="button" data-id="research">research<div class="wl-mini-lbl">Research</div></button>
                      <button class="wl-mini" type="button" data-id="remote">remote<div class="wl-mini-lbl">Remote</div></button>
                      <button class="wl-mini" type="button" data-id="erp">erp<div class="wl-mini-lbl">ERP</div></button>
                    </div>
                  </div>

                  <div class="wl-mini-group">
                    <div class="wl-mini-head">Creative</div>
                    <div class="wl-mini-grid">
                      <button class="wl-mini" type="button" data-id="design">design<div class="wl-mini-lbl">Design</div></button>
                      <button class="wl-mini" type="button" data-id="video">video<div class="wl-mini-lbl">Video</div></button>
                      <button class="wl-mini" type="button" data-id="music">music<div class="wl-mini-lbl">Music</div></button>
                      <button class="wl-mini" type="button" data-id="content">content<div class="wl-mini-lbl">Content</div></button>
                      <button class="wl-mini" type="button" data-id="render3d">render3d<div class="wl-mini-lbl">3D/VFX</div></button>
                    </div>
                  </div>

                  <div class="wl-mini-group">
                    <div class="wl-mini-head">Tech</div>
                    <div class="wl-mini-grid">
                      <button class="wl-mini" type="button" data-id="webdev">webdev<div class="wl-mini-lbl">Web Dev</div></button>
                      <button class="wl-mini" type="button" data-id="datasci">datasci<div class="wl-mini-lbl">Data</div></button>
                      <button class="wl-mini" type="button" data-id="cyber">cyber<div class="wl-mini-lbl">Cyber</div></button>
                      <button class="wl-mini" type="button" data-id="ml">ml<div class="wl-mini-lbl">ML</div></button>
                      <button class="wl-mini" type="button" data-id="gamedev">gamedev<div class="wl-mini-lbl">Game Dev</div></button>
                    </div>
                  </div>

                  <div class="wl-mini-group">
                    <div class="wl-mini-head">Engineering</div>
                    <div class="wl-mini-grid">
                      <button class="wl-mini" type="button" data-id="cad">cad<div class="wl-mini-lbl">CAD</div></button>
                      <button class="wl-mini" type="button" data-id="arch">arch<div class="wl-mini-lbl">Architecture</div></button>
                      <button class="wl-mini" type="button" data-id="science">science<div class="wl-mini-lbl">Science</div></button>
                      <button class="wl-mini" type="button" data-id="gis">gis<div class="wl-mini-lbl">GIS</div></button>
                      <button class="wl-mini" type="button" data-id="electrical">electrical<div class="wl-mini-lbl">Electrical</div></button>
                    </div>
                  </div>

                  <div class="wl-mini-group">
                    <div class="wl-mini-head">Gaming</div>
                    <div class="wl-mini-grid">
                      <button class="wl-mini" type="button" data-id="casual">casual<div class="wl-mini-lbl">Casual</div></button>
                      <button class="wl-mini" type="button" data-id="esports">esports<div class="wl-mini-lbl">Esports</div></button>
                      <button class="wl-mini" type="button" data-id="gaming">gaming<div class="wl-mini-lbl">AAA</div></button>
                      <button class="wl-mini" type="button" data-id="vr">vr<div class="wl-mini-lbl">VR</div></button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="ppanel" data-tab="budget" role="tabpanel">
                <div class="section-heading" style="margin-bottom:10px;">Budget range</div>
                <div class="preset-row" id="budgetPresets">
                  <div class="preset" data-value="any">No limit</div>
                  <div class="preset" data-value="0-600">Under $600</div>
                  <div class="preset" data-value="600-1000">$600&ndash;$1k</div>
                  <div class="preset" data-value="1000-1500">$1k&ndash;$1.5k</div>
                  <div class="preset" data-value="1500-2500">$1.5k&ndash;$2.5k</div>
                  <div class="preset" data-value="2500-99999">$2.5k+</div>
                </div>

                <div class="nudge-row" id="budgetNudgeRow">
                  <div class="nudge-head">
                    <div class="nudge-title">Budget nudge</div>
                    <div class="nudge-sub">Widen your ceiling in +10% steps.</div>
                  </div>
                  <div class="nudge-ctl" aria-label="Budget nudge control">
                    <button class="nudge-btn" type="button" id="nudgeMinus" aria-label="Decrease nudge">&minus;</button>
                    <div class="nudge-dots" id="nudgeDots" aria-label="Nudge steps"></div>
                    <button class="nudge-btn" type="button" id="nudgePlus" aria-label="Increase nudge">+</button>
                    <div class="nudge-pct" id="nudgePct">+0%</div>
                  </div>
                  <div class="nudge-ceiling" id="nudgeCeiling"></div>
                </div>
              </div>

              <div class="ppanel" data-tab="screen" role="tabpanel">
                <div class="section-heading" style="margin-bottom:10px;">Screen size</div>
                <div class="size-grid" id="sizeCards">
                  <div class="size-card" data-value="any">
                    <span class="s-ico">&#x1F4D0;</span>
                    <div class="s-title">Any Size</div>
                    <div class="s-sub">All sizes</div>
                  </div>
                  <div class="size-card" data-value="compact">
                    <span class="s-ico">&#x1F4BC;</span>
                    <div class="s-title">Compact</div>
                    <div class="s-sub">&le;14&Prime; &mdash; ultraportable</div>
                  </div>
                  <div class="size-card" data-value="standard">
                    <span class="s-ico">&#x2696;&#xFE0F;</span>
                    <div class="s-title">Standard</div>
                    <div class="s-sub">15&ndash;16&Prime; &mdash; best balance</div>
                  </div>
                  <div class="size-card" data-value="desktop">
                    <span class="s-ico">&#x1F5A5;&#xFE0F;</span>
                    <div class="s-title">Desktop</div>
                    <div class="s-sub">17&Prime;+ &mdash; stays at desk</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>


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

      <div class="p4-back-row">
        <a class="btn-back-outline btn-editprefs" href="${filtersUrl}">&#8592; Edit preferences</a>
        <a class="btn-startover" href="/workloads?reset=1">Start over</a>
      </div>

    </div>`;

  return Base(content, "Your Recommendations — LapTop", ["/public/recommendations.css"], ["/public/recommendations.js"]);
};

export default Recommendations;
