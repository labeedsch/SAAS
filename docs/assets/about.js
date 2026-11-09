/* صفحة «عن النظام»: عرض ديناميكي من about-data.js بالنمط والتفاعلات نفسها المستخدمة في صفحة «تعرف علينا» بموقع الخطط الذكية:
   شريط تقدم القراءة، فهرس أقسام لاصق يتتبع موضعك، ظهور عند التمرير، ميلان البطاقات، عدّادات، وبطاقات تفتح نافذة تفاصيل كاملة.
   لا اتصال بقاعدة البيانات. */
(() => {
  const D = window.ABOUT_DATA, v = document.getElementById('view');
  if (!D || !v) return;
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SH = (n, t, s, k = '') => `<div class="ab-sh ax-rv" data-rv="up"><span>${n}</span><div>${k ? `<small class="ax-kick">${k}</small>` : ''}<h2>${t}</h2><p>${s}</p></div></div>`;
  const S = (id, body, cls = '') => `<section class="ab-s ax-s ${cls}" id="ab-${id}">${body}</section>`;
  const btn = (attrs) => `role="button" tabindex="0" ${attrs}`;
  const stdWord = n => n === 2 ? 'معياران' : n + ' معايير';

  /* دائرة دورة العمل (إنفوجرافيك) */
  const R = 150, cx = 200, cy = 200;
  const nodes = D.flow.map((f, k) => { const a = (-90 + k * 72) * Math.PI / 180; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), f, k }; });
  const cycle = `<div class="ax-cyc ax-rv" data-rv="zoom"><svg viewBox="0 0 400 400" aria-hidden="true"><defs><linearGradient id="axg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0f8a94"/><stop offset="1" stop-color="#f0a530"/></linearGradient><marker id="axa" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0f8a94"/></marker></defs>
    <circle cx="200" cy="200" r="${R}" class="ax-ring"/><circle cx="200" cy="200" r="${R}" class="ax-ring2"/>
    ${nodes.map((n, k) => { const m = nodes[(k + 1) % 5], a1 = Math.atan2(n.y - cy, n.x - cx) + .24, a2 = Math.atan2(m.y - cy, m.x - cx) - .24; const p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)], p2 = [cx + R * Math.cos(a2), cy + R * Math.sin(a2)]; return `<path d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${R} ${R} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" class="ax-arc" style="--d:${k * .35}s" marker-end="url(#axa)"/>`; }).join('')}
    <circle cx="200" cy="200" r="70" fill="url(#axg)" class="ax-core"/></svg>
    <div class="ax-core-t"><b>الدورة</b><small>${D.flowTitle}</small></div>
    ${nodes.map(n => `<div class="ax-node" ${btn(`data-dt="flow:${n.k}" aria-label="تفاصيل: ${n.f.t}"`)} style="left:${n.x / 4}%;top:${n.y / 4}%;--d:${n.k * .12}s"><i>${ic(n.f.i)}</i><b>${n.k + 1}. ${n.f.t}</b></div>`).join('')}</div>`;
  const flowList = `<ol class="ax-fl">${D.flow.map((f, k) => `<li class="ax-rv" data-rv="left" ${btn(`data-dt="flow:${k}"`)} style="--d:${k * .08}s"><span>${k + 1}</span><div><b>${f.t}</b><p>${f.d}</p></div><em class="ab-more">${ic('next')}</em></li>`).join('')}</ol>`;

  /* محور الفئات */
  const hub = `<div class="ax-hub ax-rv" data-rv="zoom"><svg viewBox="0 0 400 400" aria-hidden="true">${D.who.map((w, k) => { const a = (-90 + k * 72) * Math.PI / 180; return `<line x1="200" y1="200" x2="${(200 + 150 * Math.cos(a)).toFixed(1)}" y2="${(200 + 150 * Math.sin(a)).toFixed(1)}" class="ax-spoke" style="--d:${k * .12}s"/>`; }).join('')}<circle cx="200" cy="200" r="150" class="ax-orb"/><circle cx="200" cy="200" r="98" class="ax-orb o2"/></svg>
    <div class="ax-hub-c">${ic('star')}<b>التقويم الذاتي</b></div>
    ${D.who.map((w, k) => { const a = (-90 + k * 72) * Math.PI / 180; return `<div class="ax-hn" ${btn(`data-dt="who:${k}" aria-label="تفاصيل: ${w.t}"`)} style="left:${(50 + 37.5 * Math.cos(a)).toFixed(2)}%;top:${(50 + 37.5 * Math.sin(a)).toFixed(2)}%;--d:${.2 + k * .12}s"><i>${ic(w.i)}</i><b>${w.t}</b><small>${w.d}</small></div>`; }).join('')}</div>`;

  const toc = [['what', 'التعريف'], ['num', 'الدليل'], ['why', 'سبب النشأة'], ['vision', 'الرؤية'], ['flow', 'دورة العمل'], ['feats', 'المزايا'], ['who', 'الفئات'], ['ba', 'قبل وبعد'], ['just', 'المبررات'], ['tech', 'البنية'], ['faq', 'أسئلة']];
  const H = D.hero, W = D.what, N = D.numbers;

  v.innerHTML = `<div class="ab ax"><div class="ax-prog" aria-hidden="true"><span></span></div>
  <section class="ax-hero"><span class="ax-blob b1" aria-hidden="true"></span><span class="ax-blob b2" aria-hidden="true"></span><span class="ax-grid" aria-hidden="true"></span>
   <div class="ax-ht"><span class="rph-chip ax-in" style="--d:.05s">${ic('star')} ${H.chip}</span>
    <h1 class="ax-in" style="--d:.15s">${H.t1} <span>${H.t2}</span></h1>
    <p class="ax-sub ax-in" style="--d:.25s">${H.sub}</p>
    <div class="ax-words ax-in" style="--d:.35s">${H.words.map((w, k) => `<span style="--k:${k}">${ic(w[0])}${w[1]}</span>`).join('')}</div>
    <div class="ab-hb ax-in" style="--d:.45s"><a class="btn ab-btn1" href="./#home">${ic('home')} استعراض الموقع</a><button class="btn ab-btn2" type="button" data-ab="share">${ic('share')} مشاركة الصفحة</button></div></div>
   <div class="ax-hv" aria-hidden="true"><div class="ax-dev"><div class="ax-bar"><i></i><i></i><i></i></div><div class="ax-row r1"><span></span><em></em></div><div class="ax-row r2"><span></span><em></em></div><div class="ax-row r3"><span></span><em></em></div><div class="ax-chart"><i style="--h:40%"></i><i style="--h:65%"></i><i style="--h:50%"></i><i style="--h:85%"></i><i style="--h:70%"></i></div></div>
    ${[['edit', 't1'], ['check', 't2'], ['rep', 't3'], ['bell', 't4'], ['news', 't5']].map(([i, c]) => `<span class="ax-fly ${c}">${ic(i)}</span>`).join('')}</div>
   <a class="ax-down" href="javascript:void 0" data-abgo="what" aria-label="انتقل إلى التعريف"><span></span></a></section>
  <div class="ab-toc" role="navigation" aria-label="أقسام الصفحة">${toc.map(([id, t]) => `<button type="button" data-abgo="${id}">${t}</button>`).join('')}</div>

  ${S('what', `<div class="ax-what"><div class="ax-rv" data-rv="up"><small class="ax-kick">${W.kick}</small><h2>${W.title}</h2><p>${W.html}</p></div>
   <div class="ax-eq ax-rv" data-rv="up" style="--d:.15s">${W.eq.map(([i, t], k) => `<span class="ax-eqi"><i>${ic(i)}</i><b>${t}</b></span>${k < W.eq.length - 1 ? '<em>+</em>' : ''}`).join('')}<em>=</em><span class="ax-eqi res"><i>${ic(W.res[0])}</i><b>${W.res[1]}</b></span></div></div>`)}

  ${S('num', SH('01', N.title, N.sub, N.kick) + `<div class="nm-tot">${N.totals.map(([n, l, i], k) => `<div class="nm-t ax-rv" data-rv="up" style="--d:${k * .07}s"><i>${ic(i)}</i><b data-count="${n}">0</b><span>${l}</span></div>`).join('')}</div>
   <div class="nm-tools"><span class="muted">اضغط على المجال لعرض معاييره</span><button class="btn soft" type="button" data-nm="all">${ic('list')} <span>عرض كل المعايير</span></button></div>
   <div class="nm-dm">${N.domains.map((d, k) => `<div class="nm-d ax-rv" data-rv="up" style="--f:var(--c${d.c}f);--b:var(--c${d.c}b);--d:${k * .07}s">
     <button type="button" class="nm-dh" aria-expanded="false" aria-controls="nmd${k}"><span class="nm-di">${ic(d.i)}</span><span class="nm-dt"><b>${d.t}</b><small>${stdWord(d.n)}</small></span><span class="nm-dc"><b data-count="${d.ind}">0</b><small>مؤشراً</small></span><span class="nm-chev">${ic('chev')}</span></button>
     <div class="nm-bar" aria-hidden="true"><span style="--w:${(d.ind / 19 * 100).toFixed(1)}%"></span></div>
     <ul class="nm-std" id="nmd${k}" hidden>${d.std.map(s => `<li>${s}</li>`).join('')}</ul></div>`).join('')}</div>
   <p class="nm-note">طول الشريط يمثل عدد مؤشرات المجال. المرجع: دليل التقويم المدرسي الذاتي للتعليم العام، الإصدار الثالث 1447هـ – 2026م.</p>`)}

  ${S('why', SH('02', 'سبب النشأة', 'من التحدي إلى الحل: لكل مشكلة في إدارة التقويم بالملفات المتفرقة معالجة داخل النظام.', 'لماذا النظام؟') + `<div class="ax-ps">${D.pains.map((p, k) => `<div class="ax-pr ax-rv" data-rv="up" style="--d:${k * .08}s"><div class="ax-p"><i>${ic(p[0])}</i><div><b>${p[1]}</b><p>${p[2]}</p></div></div><span class="ax-arr">${ic('swap')}</span><div class="ax-c"><i>${ic(D.cures[k][0])}</i><div><b>${D.cures[k][1]}</b><p>${D.cures[k][2]}</p></div></div></div>`).join('')}</div><div class="ax-ps-h" aria-hidden="true"><span>التحدي</span><span>الحل في النظام</span></div>`)}

  ${S('vision', SH('03', 'الرؤية والرسالة والهدف', 'البوصلة التي بُني عليها النظام.', 'الاتجاه') + `<div class="ax-vm">${D.vision.map(([i, t, d], k) => `<div class="ax-vc ax-rv" data-rv="flip" style="--d:${k * .12}s"><span class="ax-vn">0${k + 1}</span><i>${ic(i)}</i><b>${t}</b><p>${d}</p></div>`).join('')}</div>
   <div class="ax-goals ax-rv" data-rv="up">${D.goals.map(([i, t]) => `<span>${ic(i)}${t}</span>`).join('')}</div>`)}

  ${S('flow', SH('04', 'دورة العمل في النظام', 'خمس مراحل متصلة تربط الإسناد بالتوثيق والتقييم والاعتماد والنشر. اضغط على أي مرحلة لتفاصيلها.', 'كيف يعمل؟') + `<div class="ax-flow">${cycle}${flowList}</div>`)}

  ${S('feats', SH('05', 'المزايا', 'ما يقدمه النظام لمن يتابع التقويم أو ينفذه. اضغط على أي بطاقة لتفاصيلها الكاملة.', 'ماذا يقدم؟') + `<div class="ax-bento">${D.feats.map((f, k) => `<div class="ax-bt ${f.c} ax-rv" data-rv="up" ${btn(`data-dt="feats:${k}" aria-label="تفاصيل: ${f.t}"`)} style="--d:${(k % 4) * .07}s"><i>${ic(f.i)}</i><b>${f.t}</b><p>${f.d}</p><em class="ab-more">التفاصيل ${ic('next')}</em><span class="ax-glow2" aria-hidden="true"></span></div>`).join('')}</div>`)}

  ${S('who', SH('06', 'الفئات', D.whoTitle + '. لكل فئة صلاحياتها، واضغط عليها لتفاصيلها.', 'لمن؟') + `<div class="ax-whow">${hub}<ul class="ax-wl">${D.who.map((w, k) => `<li class="ax-rv" data-rv="left" ${btn(`data-dt="who:${k}"`)} style="--d:${k * .07}s"><i>${ic(w.i)}</i><b>${w.t}</b><span>${w.d}</span></li>`).join('')}</ul></div>`)}

  ${S('ba', SH('07', 'قبل النظام وبعده', 'الفرق الذي يحدثه النظام في إدارة التقويم الذاتي.', 'الأثر') + `<div class="ax-ba"><div class="ax-bah"><span></span><span class="b">${ic('x')} قبل النظام</span><span class="a">${ic('check')} مع النظام</span></div>${D.ba.map(([a, b, c], k) => `<div class="ax-bar2 ax-rv" data-rv="up" style="--d:${k * .06}s"><b>${a}</b><span class="b">${b}</span><span class="ax-sw" aria-hidden="true">${ic('swap')}</span><span class="a">${c}</span></div>`).join('')}</div>`)}

  ${S('just', SH('08', 'المبررات', 'لماذا يستحق النظام الاعتماد.', 'القيمة') + `<div class="ax-jt">${D.just.map(([i, t, d], k) => `<div class="ax-jc ax-rv" data-rv="${k % 2 ? 'left' : 'right'}" style="--d:${k * .05}s"><i>${ic(i)}</i><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>`)}

  ${S('tech', SH('09', 'البنية التقنية', 'رحلة البيانات من جهاز المستخدم إلى قاعدة البيانات، محمية بالصلاحيات في كل خطوة.', 'كيف بُني؟') + `<div class="ax-arch"><div class="ax-wire" aria-hidden="true"><span></span><i></i><i style="--o:1.3s"></i><i style="--o:2.6s"></i></div>${D.stack.map((s, k) => `<div class="ax-nd ax-rv" data-rv="up" style="--d:${k * .12}s"><span class="ax-ndi"><i>${ic(s.i)}</i><em>${k + 1}</em></span><small>${s.r}</small><b>${s.t}</b><p>${s.d}</p><div class="ax-chips">${s.ch.map(c => `<span>${c}</span>`).join('')}</div></div>`).join('')}</div>
   <div class="ax-sec ax-rv" data-rv="up">${D.secs.map(([i, t]) => `<span>${ic(i)}${t}</span>`).join('')}</div>`)}

  ${S('faq', SH('10', 'أسئلة متوقعة', 'إجابات مختصرة لما يُسأل عنه عادة عند عرض النظام.', 'استفسارات') + `<label class="fq-s"><span class="ico-w">${ic('search')}</span><input type="search" id="fqIn" placeholder="ابحث في الأسئلة" autocomplete="off" aria-label="ابحث في الأسئلة"></label>
   <div class="ab-faq">${D.faq.map(([q, a], k) => `<details class="ax-rv" data-rv="up" style="--d:${(k % 2) * .08}s"${k ? '' : ' open'}><summary>${ic('help')}<b>${q}</b></summary><p>${a}</p></details>`).join('')}<p class="fq-none muted" hidden>لا توجد أسئلة مطابقة.</p></div>`)}

  <section class="ab-end ax-rv" data-rv="up"><div><small>${D.credit.dev[0]}</small><b>${D.credit.dev[1]}</b><span>${D.credit.dev[2]}</span></div><div><small>${D.credit.sup[0]}</small><b>${D.credit.sup[1]}</b><span>${D.credit.sup[2]}</span></div><p class="ab-go"><a class="btn pri" href="./#home">${ic('home')} ادخل إلى الموقع</a><a class="btn pri" href="./#login">${ic('user')} دخول الفريق</a></p></section>
  </div>`;

  /* ───────── نافذة التفاصيل الكاملة ───────── */
  const groups = { flow: D.flow, feats: D.feats, who: D.who };
  const kick = { flow: 'مرحلة من دورة العمل', feats: 'ميزة', who: 'فئة' };
  const dlg = document.createElement('dialog');
  dlg.className = 'dtl'; dlg.setAttribute('aria-labelledby', 'dtlT');
  dlg.innerHTML = `<div class="dtl-in"><div class="dtl-top"><span class="dtl-k" id="dtlK"></span><button class="dtl-x" type="button" aria-label="إغلاق">${ic('x')}</button></div>
    <div class="dtl-h"><i id="dtlI"></i><div><h3 id="dtlT"></h3><p id="dtlD"></p></div></div>
    <p class="dtl-lead" id="dtlL"></p><ul class="dtl-pts" id="dtlP"></ul>
    <div class="dtl-nav"><button type="button" class="btn" data-n="-1">${ic('next')} السابق</button><span id="dtlC"></span><button type="button" class="btn pri" data-n="1">التالي ${ic('prev')}</button></div></div>`;
  document.body.append(dlg);
  let cur = null, opener = null;
  const el = id => dlg.querySelector('#' + id);
  const show = (g, i) => {
    const list = groups[g]; if (!list) return;
    i = (i + list.length) % list.length; cur = { g, i };
    const it = list[i], m = it.more || { lead: '', pts: [] };
    el('dtlK').textContent = kick[g]; el('dtlI').innerHTML = ic(it.i); el('dtlT').textContent = it.t; el('dtlD').textContent = it.d;
    el('dtlL').textContent = m.lead; el('dtlP').innerHTML = m.pts.map(p => `<li>${ic('check')}<span>${p}</span></li>`).join('');
    el('dtlC').textContent = (i + 1) + ' / ' + list.length;
    dlg.querySelector('.dtl-in').scrollTop = 0;
  };
  const open = (g, i, from) => { opener = from || null; show(g, i); if (!dlg.open) dlg.showModal(); };
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('.dtl-x')) dlg.close(); const n = e.target.closest('[data-n]'); if (n && cur) show(cur.g, cur.i + +n.dataset.n); });
  dlg.addEventListener('close', () => { if (opener && document.body.contains(opener)) opener.focus({ preventScroll: true }); });
  dlg.addEventListener('keydown', e => { if (!cur) return; if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur.g, cur.i + 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); show(cur.g, cur.i - 1); } });
  v.addEventListener('click', e => { const t = e.target.closest('[data-dt]'); if (!t) return; const [g, i] = t.dataset.dt.split(':'); open(g, +i, t); });
  v.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const t = e.target.closest('[data-dt]'); if (!t || t !== e.target) return; e.preventDefault(); const [g, i] = t.dataset.dt.split(':'); open(g, +i, t); });

  /* ───────── الفهرس والتمرير والظهور ───────── */
  const tocEl = v.querySelector('.ab-toc'), hd = document.querySelector('header');
  if (hd) { const h = hd.getBoundingClientRect().height; tocEl.style.top = `calc(env(safe-area-inset-top,0px) + ${Math.round(h + 8)}px)`; v.querySelectorAll('.ab-s[id]').forEach(x => x.style.scrollMarginTop = `calc(env(safe-area-inset-top,0px) + ${Math.round(h + tocEl.offsetHeight + 20)}px)`); }
  v.querySelectorAll('[data-abgo]').forEach(b => b.onclick = e => { e.preventDefault(); const t = document.getElementById('ab-' + b.dataset.abgo); if (t) t.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }); });
  const rv = v.querySelectorAll('.ax-rv');
  if (window.IntersectionObserver && smooth) {
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const t = e.target; t.classList.add('in'); o.unobserve(t); setTimeout(() => t.classList.add('dn'), 900 + (parseFloat(getComputedStyle(t).transitionDelay) || 0) * 1000); } }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    rv.forEach(x => o.observe(x));
  } else rv.forEach(x => x.classList.add('in', 'dn'));
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const id = e.target.id.slice(3); tocEl.querySelectorAll('button').forEach(b => { const on = b.dataset.abgo === id; b.classList.toggle('on', on); if (on && tocEl.scrollWidth > tocEl.clientWidth) tocEl.scrollTo({ left: b.offsetLeft - tocEl.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' }); }); } }), { rootMargin: '-35% 0px -60% 0px' });
    v.querySelectorAll('.ab-s[id]').forEach(s => io.observe(s));
  }
  const pr = v.querySelector('.ax-prog span'), hero = v.querySelector('.ax-hv');
  const onScroll = () => { const m = document.documentElement.scrollHeight - innerHeight; pr.style.transform = `scaleX(${m > 0 ? Math.min(1, scrollY / m) : 0})`; if (hero && smooth && scrollY < 900) hero.style.transform = `translateY(${scrollY * .12}px)`; };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (smooth && matchMedia('(hover:hover)').matches) v.querySelectorAll('.ax-bt,.ax-vc').forEach(c => {
    c.onpointermove = e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg'); c.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg'); c.style.setProperty('--mx', (x + .5) * 100 + '%'); c.style.setProperty('--my', (y + .5) * 100 + '%'); };
    c.onpointerleave = () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); };
  });

  /* عدّادات الأرقام */
  const counters = v.querySelectorAll('[data-count]');
  const count = n => { const to = +n.dataset.count; if (!smooth) { n.textContent = to; return; } const t0 = performance.now(); const step = t => { const p = Math.min(1, (t - t0) / 900); n.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  if (window.IntersectionObserver) { const co = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { count(e.target); co.unobserve(e.target); } }), { threshold: .6 }); counters.forEach(c => co.observe(c)); }
  else counters.forEach(c => c.textContent = c.dataset.count);

  /* المجالات: فتح وإغلاق المعايير */
  const doms = [...v.querySelectorAll('.nm-d')], allBtn = v.querySelector('[data-nm="all"]');
  const setDom = (d, on) => { d.classList.toggle('open', on); d.querySelector('.nm-dh').setAttribute('aria-expanded', on); d.querySelector('.nm-std').hidden = !on; };
  const syncAll = () => { const all = doms.every(d => d.classList.contains('open')); allBtn.querySelector('span').textContent = all ? 'إخفاء كل المعايير' : 'عرض كل المعايير'; };
  doms.forEach(d => d.querySelector('.nm-dh').onclick = () => { setDom(d, !d.classList.contains('open')); syncAll(); });
  allBtn.onclick = () => { const all = doms.every(d => d.classList.contains('open')); doms.forEach(d => setDom(d, !all)); syncAll(); };

  /* بحث الأسئلة */
  const fi = v.querySelector('#fqIn'), fd = [...v.querySelectorAll('.ab-faq details')], none = v.querySelector('.fq-none');
  fi.oninput = () => { const q = fi.value.trim(); let n = 0; fd.forEach(d => { const hit = !q || d.textContent.includes(q); d.hidden = !hit; if (hit) n++; if (q && hit) d.open = true; }); none.hidden = n > 0; };

  /* مشاركة الصفحة */
  const toast = m => { const d = document.createElement('div'); d.className = 'ab-toast'; d.textContent = m; document.body.append(d); setTimeout(() => d.remove(), 3200); };
  const sb = v.querySelector('[data-ab="share"]');
  sb.onclick = async () => {
    const url = location.href.split('#')[0], d = { title: 'التقويم الذاتي الذكي | متوسطة لبيد بن ربيعة', text: 'تعرّف على نظام التقويم الذاتي الذكي في مدرسة لبيد بن ربيعة المتوسطة', url };
    try { if (navigator.share) { await navigator.share(d); return; } await navigator.clipboard.writeText(url); toast('نُسخ رابط الصفحة'); }
    catch (e) { if (e && e.name === 'AbortError') return; prompt('انسخ رابط الصفحة:', url); }
  };
})();
