// Read workloads passed forward from /workloads page
const params = new URLSearchParams(window.location.search);
const workloads = params.get('workloads') || '';

function selectPreset(el) {
  document.querySelectorAll('.preset').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
}

function selectSize(el) {
  document.querySelectorAll('.size-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}

// Wire up Back button to preserve workloads param
document.querySelector('.btn-back-outline').href =
  `/workloads${workloads ? '?workloads=' + encodeURIComponent(workloads) : ''}`;

function findLaptops() {
  const budget = document.querySelector('.preset.sel')?.dataset.value || 'any';
  const size   = document.querySelector('.size-card.sel')?.dataset.value || 'any';
  window.location.href = `/recommend?workloads=${encodeURIComponent(workloads)}&budget=${budget}&size=${size}`;
}
