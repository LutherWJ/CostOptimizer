// Nav arrows (prev/next) shared across pages.
// Supports either:
// - data-href navigation (multi-page site)
// - data-showpage navigation via an existing global showPage(n)
(() => {
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function clampInt(n, lo, hi) {
    const x = Number.isFinite(n) ? Math.trunc(n) : lo;
    return Math.min(hi, Math.max(lo, x));
  }

  onReady(() => {
    const pagers = Array.from(document.querySelectorAll(".nav-pager"));
    if (!pagers.length) return;

    // If we're on /filters, preserve workloads param for "Back".
    // (Workloads page doesn't currently restore selection from query, but we still preserve state in URL.)
    if (location.pathname === "/filters") {
      const qs = new URLSearchParams(location.search);
      const w = qs.get("workloads");
      const major = qs.get("major");
      if (w) {
        pagers.forEach((pager) => {
          const prevBtn = pager.querySelector('.nav-arrow[data-dir="prev"]');
          if (prevBtn && prevBtn.dataset.href === "/workloads") {
            const backQs = new URLSearchParams();
            backQs.set("workloads", w);
            if (major) backQs.set("major", major);
            prevBtn.dataset.href = `/workloads?${backQs.toString()}`;
          }
        });
      }
    }

    pagers.forEach((pager) => {
      pager.querySelectorAll(".nav-arrow").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.disabled || btn.getAttribute("aria-disabled") === "true") return;

          const action = btn.dataset.action;
          if (action && typeof window[action] === "function") {
            window[action]();
            return;
          }

          const showPageArg = btn.dataset.showpage;
          if (showPageArg != null && typeof window.showPage === "function") {
            const n = clampInt(parseInt(showPageArg, 10), -999, 999);
            window.showPage(n);
            return;
          }

          const href = btn.dataset.href;
          if (href) window.location.href = href;
        });
      });
    });
  });
})();
