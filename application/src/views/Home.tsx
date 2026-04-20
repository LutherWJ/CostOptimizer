import Base from "./Base";

const Home = () => {
  const content = `
    <nav>
      <a class="nav-logo" href="/">
        <span class="nav-dot"></span>LapTop
      </a>
      <div class="nav-right">
        <div class="nav-pager" aria-label="Page navigation">
          <button class="nav-arrow" type="button" data-dir="prev" disabled aria-disabled="true" aria-label="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="nav-page-label">Home</div>
          <button class="nav-arrow" type="button" data-dir="next" data-href="/workloads" aria-label="Next">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </nav>

    <div class="hero">
      <div class="hero-left">
        <h1 class="hero-h1">
          School laptop<br>
          <span class="teal-line">max value</span>
        </h1>

        <div class="trust-block">
          <div class="trust-bar"></div>
          <p class="trust-text">
            <strong>New doesn't mean best.</strong> LapTop shows what you need to spend, not what schools say you to have.
          </p>
        </div>

        <a class="hero-cta" href="/workloads">Find My LapTop</a>

        <p class="overpay-block">
          Most buyers overpay by <strong>20&ndash;40%</strong>. Find the right computer for your workload at the price it should be.
        </p>
      </div>

      <div class="hero-right">
        <div class="hero-photo">
          <img src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&auto=format&fit=crop&q=80&sat=-60&bri=-20" alt="Laptop on desk"/>
        </div>
        <div class="photo-overlay"></div>

        <div class="fc fc-white fc-a">
          <div class="fc-label">Program Match</div>
          <div class="fc-val">Engineering</div>
          <div class="fc-sub">Windows &middot; 32GB &middot; RTX</div>
        </div>

        <div class="fc fc-dark fc-b">
          <div class="fc-label">Compatible</div>
          <div class="fc-compat-row">
            <span>&#10003; ExamSoft &middot; Windows &middot; Webcam</span>
          </div>
        </div>

        <div class="fc fc-teal fc-c">
          <div class="fc-min">2 min</div>
          <div class="fc-min-sub">to your match</div>
        </div>
      </div>
    </div>
  `;

  return Base(content, "LapTop — School laptop, max value", ["/public/home.css"]);
};

export default Home;
