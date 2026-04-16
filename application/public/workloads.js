const selectedWLs = new Set();

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
  updateContinueBtn();
}

function goToFilters() {
  if (selectedWLs.size === 0) return;
  const params = Array.from(selectedWLs).join(',');
  window.location.href = `/filters?workloads=${encodeURIComponent(params)}`;
}
