export function setHeaderTitle(title) {
  const el = document.getElementById('header-title');
  if (el) el.textContent = title;
}

export function showBackButton(show) {
  const btn = document.getElementById('header-back');
  if (btn) btn.classList.toggle('hidden', !show);
}
