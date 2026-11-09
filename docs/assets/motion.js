/* حركة الواجهة: عدّادات أرقام، ظهور متتابع للبطاقات، امتلاء الأشرطة والحلقات.
   تعمل على صفحة المقارنة ولوحة التحكم، وتراقب إعادة الرسم (التحديث التلقائي كل دقيقة) فلا تعيد الحركة لما لم يتغيّر،
   وما تغيّرت قيمته يتحرك من قيمته القديمة إلى الجديدة ويومض. */
(() => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches || !('IntersectionObserver' in window)) return;
  const NUM = /^([+−-]?)(\d[\d,]*)(\.\d+)?(%?)$/, FRAC = /^(\d[\d,]*)\/(\d[\d,]*)$/;
  const COUNT = '.k b,.hgau .mid b,.gapw b,.pcts,.bn,.pv,.sc .rng b,.dbar .rng>span,.kc-v,.kc-pc,.db-k b,.db-rg b,.mo-n';
  const BARS = '.kc-b u,.db-pb span', RINGS = '.db-rg .v', REVEAL = '.k,.sc,.prio,.dbar,.kc,.db-k,.db-g,.db-ring,.cd';
  const CARD = '.kc,.db-k,.db-ring,.k,.sc,.dbar,.gapw,.dsec,.srow,.prio,.cd,.db-g';
  const done = new WeakSet(), seen = new Map(), shown = new Set(), jobs = new WeakMap();
  const ease = t => 1 - Math.pow(1 - t, 3);
  const keyOf = (el, tag) => location.hash + '|' + tag + '|' + el.className + '|' +
    ((el.closest(CARD) || el.parentElement || el).textContent || '').replace(/[\d.,%+−\-\/]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 50);

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target); const j = jobs.get(e.target); if (j) j();
  }), { threshold: .2 });
  const later = (el, fn) => { jobs.set(el, fn); io.observe(el); };

  function count(el) {
    const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim()); if (!tn) return;
    const raw = tn.nodeValue, t = raw.trim(), m = t.match(NUM), fr = m ? null : t.match(FRAC); if (!m && !fr) return;
    const sign = m ? m[1] : '', suf = m ? m[4] : '', tail = fr ? '/' + fr[2] : '', dec = m && m[3] ? m[3].length - 1 : 0, comma = (m ? m[2] : fr[1]).includes(',');
    const target = parseFloat(((m ? m[2] + (m[3] || '') : fr[1])).replace(/,/g, '')), key = keyOf(el, 'c'), prev = seen.get(key);
    seen.set(key, target); if (prev === target || !target) return;
    const fmt = v => raw.replace(t, sign + (comma ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)) + suf + tail);
    const from = prev !== undefined ? prev : 0, dur = prev !== undefined ? 700 : 1100;
    tn.nodeValue = fmt(from);
    later(el, () => {
      const c = el.closest(CARD); if (prev !== undefined && c) { c.classList.add('mo-flash'); setTimeout(() => c.classList.remove('mo-flash'), 2400); }
      const t0 = performance.now(); (function f(now) { const p = Math.min(1, (now - t0) / dur); tn.nodeValue = p < 1 ? fmt(from + (target - from) * ease(p)) : raw; if (p < 1) requestAnimationFrame(f); })(t0);
    });
  }
  function bar(el) {
    const w = el.style.width; if (!w) return; const key = keyOf(el, 'b'), prev = seen.get(key); seen.set(key, w); if (prev === w) return;
    el.style.transition = 'none'; el.style.width = prev || '0%';
    later(el, () => { void el.offsetWidth; el.style.transition = 'width 1.1s cubic-bezier(.2,.8,.2,1)'; el.style.width = w; });
  }
  function ring(el) {
    const a = el.getAttribute('stroke-dasharray'); if (!a) return; const key = keyOf(el, 'g'), prev = seen.get(key); seen.set(key, a); if (prev === a) return;
    el.style.transition = 'none'; el.style.strokeDasharray = prev || `0 ${a.split(/\s+/)[1] || 214}`;
    later(el, () => { void el.getBoundingClientRect(); el.style.transition = 'stroke-dasharray 1.2s cubic-bezier(.2,.8,.2,1)'; el.style.strokeDasharray = a; });
  }
  function reveal(el) {
    const key = keyOf(el, 'r'); if (shown.has(key)) return; shown.add(key);
    const idx = el.parentElement ? [...el.parentElement.children].filter(x => x.matches(REVEAL)).indexOf(el) : 0, d = Math.min(Math.max(idx, 0), 9) * 70;
    el.classList.add('mo-r'); el.style.setProperty('--mo-d', d + 'ms');
    later(el, () => { el.classList.add('mo-in'); setTimeout(() => { el.classList.remove('mo-r', 'mo-in'); el.style.removeProperty('--mo-d'); }, 1000 + d); });
  }
  function live() {
    const ht = document.querySelector('.db-ht'); if (!ht || ht.querySelector('.mo-live')) return;
    const s = document.createElement('span'); s.className = 'mo-live'; s.title = 'تتحدّث البيانات تلقائياً كل دقيقة'; s.innerHTML = '<i></i>مباشر';
    const sm = ht.querySelector('small'); (sm || ht).appendChild(s);
  }
  function scan() {
    for (const [sel, fn] of [[REVEAL, reveal], [COUNT, count], [BARS, bar], [RINGS, ring]])
      document.querySelectorAll(sel).forEach(el => { if (!done.has(el)) { done.add(el); fn(el); } });
    live();
  }
  let q = 0; const sched = () => { if (!q) q = requestAnimationFrame(() => { q = 0; scan(); }); };
  new MutationObserver(sched).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => { seen.clear(); shown.clear(); });
  scan();
})();
