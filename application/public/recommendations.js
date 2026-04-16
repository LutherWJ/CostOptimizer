// Workload pill filtering + sort for /recommend page

function pickPill(el) {
  document.querySelectorAll('.rpill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  filterByPill(el.dataset.workload || '');
}

function filterByPill(workloadName) {
  const cards = Array.from(document.querySelectorAll('.rec-card'));
  const pillEmpty = document.getElementById('pillEmpty');

  if (!workloadName) {
    // "All workloads" — show everything
    cards.forEach(c => c.classList.remove('hidden'));
    if (pillEmpty) pillEmpty.classList.remove('show');
    return;
  }

  let anyVisible = false;
  cards.forEach(card => {
    const supported = (card.dataset.workloads || '').split(',');
    if (supported.includes(workloadName)) {
      card.classList.remove('hidden');
      anyVisible = true;
    } else {
      card.classList.add('hidden');
    }
  });

  if (pillEmpty) {
    pillEmpty.classList.toggle('show', !anyVisible);
  }
}

function pickSort(el) {
  document.querySelectorAll('.sbtn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');

  const grid = document.getElementById('recGrid');
  const cards = Array.from(grid.querySelectorAll('.rec-card'));

  // Fade out
  grid.style.opacity = '0';

  setTimeout(() => {
    const key = el.dataset.sort;
    cards.sort((a, b) => {
      if (key === 'price-asc')  return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
      if (key === 'price-desc') return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
      if (key === 'battery')    return parseFloat(b.dataset.battery) - parseFloat(a.dataset.battery);
      if (key === 'value')      return parseFloat(b.dataset.value)   - parseFloat(a.dataset.value);
      // default: best match (original DOM order stored in data-idx)
      return parseInt(a.dataset.idx) - parseInt(b.dataset.idx);
    });

    cards.forEach(c => grid.appendChild(c));

    // Re-apply .best to first non-hidden card
    const visible = cards.filter(c => !c.classList.contains('hidden'));
    cards.forEach(c => c.classList.remove('best'));
    if (visible.length) visible[0].classList.add('best');

    grid.style.opacity = '1';
  }, 130);
}
