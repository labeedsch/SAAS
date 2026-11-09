/* قائمة «تحليل النتائج» المنسدلة في الترويسة: تفتح بالنقر وتُغلق بالنقر خارجها أو بـ Esc.
   على الجوال تُعرض عناصرها مباشرة داخل قائمة الترويسة (انظر theme.css). */
(() => {
  const gs = [...document.querySelectorAll('.ng')];
  if (!gs.length) return;
  const set = (g, on) => { g.classList.toggle('open', on); g.querySelector('.ngb').setAttribute('aria-expanded', on ? 'true' : 'false'); };
  gs.forEach(g => {
    const b = g.querySelector('.ngb');
    b.addEventListener('click', e => { e.stopPropagation(); const on = !g.classList.contains('open'); gs.forEach(x => set(x, false)); set(g, on); });
    g.addEventListener('keydown', e => { if (e.key === 'Escape') { set(g, false); b.focus(); } });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.ng')) gs.forEach(x => set(x, false)); });
})();
