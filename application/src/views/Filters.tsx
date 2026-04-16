import Base from "./Base";

const Filters = () => {
  const content = `
    <nav>
      <a class="nav-logo" href="/">
        <span class="nav-dot"></span>LapTop
      </a>
      <div class="nav-right">
        <div class="nav-steps">
          <div class="step-dot done">1</div>
          <div class="step-line done"></div>
          <div class="step-dot active">2</div>
        </div>
      </div>
    </nav>

    <div class="step-page">
      <div class="filter-card">

        <div class="step-eyebrow">Step 2 of 2</div>
        <h2>Filter?</h2>

        <div class="section-heading">Budget range</div>
        <div class="preset-row">
          <div class="preset sel" data-value="any"    onclick="selectPreset(this)">No limit</div>
          <div class="preset"     data-value="0-600"  onclick="selectPreset(this)">Under $600</div>
          <div class="preset"     data-value="600-1000"   onclick="selectPreset(this)">$600–$1k</div>
          <div class="preset"     data-value="1000-1500"  onclick="selectPreset(this)">$1k–$1.5k</div>
          <div class="preset"     data-value="1500-2500"  onclick="selectPreset(this)">$1.5k–$2.5k</div>
          <div class="preset"     data-value="2500-99999" onclick="selectPreset(this)">$2.5k+</div>
        </div>

        <div class="section-heading">Screen size</div>
        <div class="size-grid">
          <div class="size-card sel" data-value="any" onclick="selectSize(this)">
            <span class="s-ico">📐</span>
            <div class="s-title">Any Size</div>
            <div class="s-sub">All sizes</div>
          </div>
          <div class="size-card" data-value="compact" onclick="selectSize(this)">
            <span class="s-ico">💼</span>
            <div class="s-title">Compact</div>
            <div class="s-sub">&le;14&Prime; — ultraportable</div>
          </div>
          <div class="size-card" data-value="standard" onclick="selectSize(this)">
            <span class="s-ico">⚖️</span>
            <div class="s-title">Standard</div>
            <div class="s-sub">15–16&Prime; — best balance</div>
          </div>
          <div class="size-card" data-value="desktop" onclick="selectSize(this)">
            <span class="s-ico">🖥️</span>
            <div class="s-title">Desktop</div>
            <div class="s-sub">17&Prime;+ — stays at desk</div>
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
