/* شريط الترويسة (أخضر + ذهبي): يتحرك المقطع الذهبي بحسب موضع التمرير في الصفحة */
(() => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const root = document.documentElement;
  let raf = 0;
  const update = () => {
    raf = 0;
    const max = root.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    root.style.setProperty('--sp', p.toFixed(4));
    const hd = document.querySelector('header'); if (hd) hd.classList.toggle('scrolled', scrollY > 8);
  };
  const tick = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick);
  update();
})();
