/* قائمة الترويسة على الجوال: فتح/إغلاق، وإغلاقها عند اختيار رابط أو الضغط خارجها أو Esc */
(() => {
  const btn = document.getElementById('navToggle'), nav = document.getElementById('nav');
  if (!btn || !nav) return;
  const hd = btn.closest('header');
  const set = on => { hd.classList.toggle('open', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  btn.addEventListener('click', () => set(!hd.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', e => { if (!hd.contains(e.target)) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  window.addEventListener('hashchange', () => set(false));
  matchMedia('(min-width:761px)').addEventListener('change', () => set(false));
})();
