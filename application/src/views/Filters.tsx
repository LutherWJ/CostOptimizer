import Base from "./Base";

const Filters = () => {
  const content = `
    <nav>
      <a class="nav-logo" href="/">
        <span class="nav-dot"></span>LapTop
      </a>
      <div class="nav-right">
        <div class="nav-pager" aria-label="Page navigation">
          <button class="nav-arrow" type="button" data-dir="prev" data-href="/workloads" aria-label="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="nav-page-label">Filters</div>
          <button class="nav-arrow" type="button" data-dir="next" data-action="findLaptops" aria-label="Next">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </nav>

    <div class="step-page">
      <div class="filter-card">

        <div class="step-eyebrow">Step 2 of 2</div>
        <h2>Filter?</h2>

        <div class="section-heading">Budget range</div>
        <div class="preset-row" id="budgetPresets">
          <div class="preset sel" data-value="any"    onclick="selectPreset(this)">No limit</div>
          <div class="preset"     data-value="0-600"  onclick="selectPreset(this)">Under $600</div>
          <div class="preset"     data-value="600-1000"   onclick="selectPreset(this)">$600&ndash;$1k</div>
          <div class="preset"     data-value="1000-1500"  onclick="selectPreset(this)">$1k&ndash;$1.5k</div>
          <div class="preset"     data-value="1500-2500"  onclick="selectPreset(this)">$1.5k&ndash;$2.5k</div>
          <div class="preset"     data-value="2500-99999" onclick="selectPreset(this)">$2.5k+</div>
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

        <div class="section-heading">Screen size</div>
        <div class="size-grid" id="sizeCards">
          <div class="size-card sel" data-value="any" onclick="selectSize(this)">
            <span class="s-ico">&#x1F4D0;</span>
            <div class="s-title">Any Size</div>
            <div class="s-sub">All sizes</div>
          </div>
          <div class="size-card" data-value="compact" onclick="selectSize(this)">
            <span class="s-ico">&#x1F4BC;</span>
            <div class="s-title">Compact</div>
            <div class="s-sub">&le;14&Prime; &mdash; ultraportable</div>
          </div>
          <div class="size-card" data-value="standard" onclick="selectSize(this)">
            <span class="s-ico">&#x2696;&#xFE0F;</span>
            <div class="s-title">Standard</div>
            <div class="s-sub">15&ndash;16&Prime; &mdash; best balance</div>
          </div>
          <div class="size-card" data-value="desktop" onclick="selectSize(this)">
            <span class="s-ico">&#x1F5A5;&#xFE0F;</span>
            <div class="s-title">Desktop</div>
            <div class="s-sub">17&Prime;+ &mdash; stays at desk</div>
          </div>
        </div>

        <div class="nav-btns">
          <a class="btn-back-outline" href="/workloads">&larr; Back</a>
          <button class="btn-find" onclick="findLaptops()">Find My Laptop &rarr;</button>
        </div>

      </div>
    </div>
  `;

  return Base(content, "LapTop — Filters", ["/public/filters.css"], ["/public/filters.js"]);
};

export default Filters;

