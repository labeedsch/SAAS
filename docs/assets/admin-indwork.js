/* مساحة عمل المؤشر (لوحة التحكم): صفحة تشغيلية تجمع الاسترشاد والشواهد والتقييم والزيارات والمهام في مسار واحد.
   تعرض ما يُقرأ أولاً ثم ما يُنفَّذ، وتحدّد «الخطوة التالية» من حالة المؤشر الفعلية. لا تغيّر صفحة المؤشر في الموقع العام. */
(() => {
const { h, raw, S, L, nf, dt, dtt, staffName, sb_, btn, isCoord, role, canReview } = App;
const ic = n => App.ico(n);
const LVK = { excellence: 'ex', advancement: 'ad', launch: 'la', preparation: 'pr' };
const pctTxt = p => p == null ? '—' : nf(Math.round(p)) + '%';


/* عبارات جاهزة للاختيار المتعدد (مساعدة للكتابة، قابلة للتعديل؛ ليست نصاً رسمياً من الدليل) */
const PH = {
  just: [['الشواهد', ['تتوفر شواهد معتمدة تغطي متطلبات المؤشر', 'الشواهد المتوفرة تغطي المتطلبات جزئياً', 'لا توجد شواهد كافية بعد', 'الشواهد حديثة وتخص الدورة الحالية', 'الشواهد موثقة بالتواريخ والأسماء']],
    ['الممارسة', ['الممارسة مطبقة ومستمرة', 'الممارسة مطبقة جزئياً', 'الممارسة غير مطبقة بعد', 'الممارسة موثقة بإجراءات مكتوبة', 'أثر الممارسة ظاهر في النتائج']],
    ['المتابعة', ['تم التحقق ميدانياً عبر زيارة فنية', 'توجد مراجعة دورية للممارسة', 'توجد خطة تحسين قائمة']]],
  str: [['', ['وضوح الإجراءات والمسؤوليات', 'توثيق منظم ومحدّث', 'مشاركة فاعلة من منسوبي المدرسة', 'متابعة دورية ومنتظمة', 'استمرارية الممارسة', 'أثر إيجابي على المتعلمين', 'تعاون المجتمع المدرسي']]],
  gap: [['', ['نقص في الشواهد الموثقة', 'غياب التوثيق المنتظم', 'ضعف المتابعة الدورية', 'عدم وضوح المسؤوليات', 'الممارسة غير مستمرة', 'لا يوجد قياس لأثر الممارسة', 'تأخر في استكمال المتطلبات']]],
  src: [['', ['الشواهد المرفوعة في النظام', 'سجلات ووثائق المدرسة', 'محاضر الاجتماعات', 'الزيارات الفنية', 'الملاحظات الصفية', 'الاستبانات', 'نظام نور', 'نتائج المتعلمين', 'مقابلات']]],
};
const PT = { just: 'اختر مبررات جاهزة', str: 'اختر جوانب القوة', gap: 'اختر الفجوات', src: 'اختر مصادر البيانات' };
const flat = k => PH[k].flatMap(g => g[1]);
const parts = (k, text) => { const all = new Set(flat(k)), sel = new Set(), free = []; String(text || '').split('\n').forEach(l => { const t = l.replace(/^•\s*/, '').trim(); if (/^•\s/.test(l) && all.has(t)) sel.add(t); else free.push(l); }); return { sel, free: free.join('\n').trim() }; };
const ddf = (k, label, rows, value, req) => { const { sel } = parts(k, value);
  return h`<div class="iw-fld" data-k="${k}"><label class="iw-f" for="iw-${k}">${label}${req ? h`<em>${req}</em>` : ''}</label>
    <details class="iw-dd"><summary><span>${PT[k]}</span><b class="n">${nf(sel.size)}</b></summary><div class="iw-ddp" role="group" aria-label="${PT[k]}">
      ${PH[k].map(([g, xs]) => h`${g ? h`<strong>${g}</strong>` : ''}${xs.map(x => h`<label><input type="checkbox" value="${x}" ${sel.has(x) ? raw('checked') : ''}><span>${x}</span></label>`)}`)}
      <div class="iw-ddf"><button type="button" class="btn sm" data-ddclr="${k}">مسح الاختيار</button><button type="button" class="btn sm pri" data-ddok>تم</button></div></div></details>
    <textarea id="iw-${k}" rows="${rows}" placeholder="اختر من القائمة أو اكتب بصياغتك">${value || ''}</textarea></div>`; };
const syncDD = fld => { const k = fld.dataset.k, ta = fld.querySelector('textarea'), { free } = parts(k, ta.value), chk = [...fld.querySelectorAll('input:checked')].map(i => '• ' + i.value);
  ta.value = [...chk, free].filter(Boolean).join('\n'); fld.querySelector('.n').textContent = nf(chk.length); };
document.addEventListener('change', e => { const f = e.target.closest?.('.iw-fld'); if (f && e.target.matches('.iw-ddp input')) syncDD(f); });
document.addEventListener('input', e => { const f = e.target.closest?.('.iw-fld'); if (!f || !e.target.matches('textarea')) return; const { sel } = parts(f.dataset.k, e.target.value);
  f.querySelectorAll('.iw-ddp input').forEach(i => { i.checked = sel.has(i.value); }); f.querySelector('.n').textContent = nf(sel.size); });
document.addEventListener('click', e => {
  const c = e.target.closest('[data-ddclr]'); if (c) { const f = c.closest('.iw-fld'); f.querySelectorAll('.iw-ddp input').forEach(i => { i.checked = false; }); syncDD(f); return; }
  if (e.target.closest('[data-ddok]')) { e.target.closest('details').open = false; return; }
  document.querySelectorAll('.iw-dd[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.iw-dd[open]').forEach(d => { d.open = false; d.querySelector('summary').focus(); }); });

App.indWork = d => {
  const { id, ind, ev, evAll, se, gd, gde, vc, tk, levels, lvOf, active } = d, co = isCoord(), pr = role() === 'principal';
  const st = ev?.status || 'not_evaluated', cur = ev?.achievement_pct != null ? lvOf(Number(ev.achievement_pct)) : null;
  const ap = evAll.filter(e => e.status === 'approved'), fix = evAll.filter(e => ['needs_completion', 'rejected'].includes(e.status)), pend = evAll.filter(e => ['new', 'under_review'].includes(e.status));
  const upTitles = new Set(evAll.map(e => (e.title || '').trim()));
  const canEdit = d.iEvaluate && active && st !== 'approved' || (co || pr) && active;
  // الخطوات وحالتها
  const steps = [
    ['s-guide', 'الاسترشاد', 'book', 'done'],
    ['s-evid', 'أرفق الشواهد', 'clip', fix.length ? 'need' : ap.length ? 'done' : evAll.length ? 'wait' : 'todo'],
    ['s-eval', 'قيّم', 'note', st === 'approved' ? 'done' : st === 'submitted' ? 'wait' : st === 'draft' ? 'need' : 'todo'],
    ['s-follow', 'زيارات ومهام', 'visit', vc.length || tk.length ? 'done' : 'todo']];
  // الخطوة التالية
  let nx;
  if (fix.length) nx = { tone: 'warn', t: `شاهد يحتاج استكمالاً: ${fix[0].title}`, s: fix[0].review_note || 'راجع ملاحظة المراجعة وأعد رفع الشاهد.', go: 's-evid', l: 'إلى الشواهد' };
  else if (!evAll.length) nx = { tone: 'info', t: 'ابدأ برفع أول شاهد', s: 'اقرأ الاسترشاد ثم أرفق ما يثبت تحقق المؤشر.', go: 's-evid', l: 'أرفق شاهداً' };
  else if (st === 'not_evaluated' || st === 'draft') nx = { tone: 'info', t: st === 'draft' ? 'أكمل التقييم وأرسله للاعتماد' : 'سجّل تقييم المؤشر', s: 'اختر المستوى واكتب مبررات التقييم.', go: 's-eval', l: 'إلى التقييم' };
  else if (st === 'submitted') nx = { tone: 'info', t: co || pr ? 'تقييم بانتظار اعتمادك' : 'التقييم بانتظار اعتماد المنسق', s: pend.length ? `وبقي ${nf(pend.length)} شاهد قيد المراجعة.` : 'لا إجراء مطلوب منك الآن.', go: 's-eval', l: 'عرض التقييم' };
  else nx = { tone: 'ok', t: 'اكتمل المؤشر', s: `التقييم معتمد${cur ? ' بمستوى ' + cur.label : ''}.`, go: 's-eval', l: 'عرض التقييم' };
  if (!active) nx = { tone: 'warn', t: 'الدورة غير نشطة', s: 'التعديل متوقف حتى تُفعَّل الدورة.', go: 's-guide', l: 'قراءة المؤشر' };

  const owners = [['مسؤول المؤشر', d.respNames, 'يوفّر الشواهد والمعلومات'], ['مقيّم المؤشر', d.evalNames, 'يدرس ويقيّم ويكتب المبررات']];
  const head = h`<header class="iw-h"><div class="iw-hc"><div class="iw-chips"><span class="iw-chip dom">${ic('layers')} ${ind.dom.name_ar}</span><span class="iw-chip">${ic('doc')} ${ind.std.name_ar}</span><span class="iw-chip code" dir="ltr">${ind.code}</span>${sb_('eval', st)}</div>
      <h1>${ind.official_text}</h1>
      <div class="iw-own">${owners.map(([l, ns, t]) => h`<div><span class="iw-ov">${ns.length ? ns.slice(0, 3).map(n => App.avatarHtml(S.staff.find(s => s.full_name === n) || { full_name: n }, 46)) : ic('users')}</span><div><small>${l}</small><b>${ns.length ? ns.map(n => App.ncell(n, 22)) : 'لم يُسنَد بعد'}</b><em>${t}</em></div></div>`)}</div></div>
    <div class="iw-lvbox lv-${cur ? LVK[cur.code] || 'x' : 'none'}"><div class="iw-ring" style="--p:${ev?.achievement_pct ?? 0}"><b>${pctTxt(ev?.achievement_pct)}</b></div><strong>${cur ? cur.label : 'لم يُقيَّم'}</strong><small>${d.cyc.name}</small></div></header>`;

  const nav = h`<nav class="iw-steps" aria-label="مسار العمل على المؤشر">${steps.map(([k, l, i, s], n) => h`<a href="#" class="iw-st ${s}" data-jump="${k}"><span class="iw-sn">${s === 'done' ? ic('check') : s === 'need' ? ic('edit') : s === 'wait' ? ic('clock') : nf(n + 1)}</span><span>${l}</span></a>`)}</nav>
    <div class="iw-next ${nx.tone}" role="status"><span class="iw-ni">${ic(nx.tone === 'ok' ? 'check' : nx.tone === 'warn' ? 'alert' : 'flag')}</span><div><b>${nx.t}</b><small>${nx.s}</small></div><a href="#" class="btn sm ${nx.tone === 'ok' ? '' : 'pri'}" data-jump="${nx.go}">${nx.l}</a></div>`;

  // 1) الاسترشاد
  const guide = h`<section class="iw-sec iw-guide" id="s-guide" aria-labelledby="h-guide"><h2 id="h-guide">${ic('book')} الاسترشاد <small>اقرأه أولاً قبل رفع الشواهد والتقييم</small></h2>
    ${gd ? h`<details class="iw-gd" open><summary>${ic('book')} عرض الاسترشاد أو طيّه <small>للقراءة فقط</small></summary>
      ${ind.is_government_applicable === false ? h`<p class="iw-gnote" role="note">${ic('alert')} تنبيه: هذا المؤشر يستهدف المدارس الأهلية والعالمية ولا ينطبق على المدارس الحكومية.</p>` : ''}
      <div class="iw-gg"><section><h4>${ic('note')} تفسير المؤشر</h4><p>${gd.interpretation}</p></section>
        <section><h4>${ic('flag')} ماذا يدل عليه؟</h4><p>${gd.significance}</p></section></div>
      <section class="iw-gev"><h4>${ic('clip')} الشواهد المقترحة <small>استرشادية، وليست شواهد مرفوعة</small></h4>
        ${gde.length ? h`<ol>${gde.map(x => h`<li>${x.title}</li>`)}</ol>` : h`<p class="muted">لا شواهد مقترحة.</p>`}</section></details>`
      : h`<p class="muted empty">لا يوجد محتوى استرشادي لهذا المؤشر.</p>`}</section>`;

  // 2) الشواهد
  const row = e => h`<li class="iw-ev ${e.status}"><span class="iw-ei">${ic(e.status === 'approved' ? 'check' : fix.includes(e) ? 'edit' : 'clip')}</span><div class="iw-eb"><b>${e.title}</b>${e.indicator_id !== id ? h`<a class="iw-sh" href="#ind/${e.indicator_id}">مشترك من ${d.ref.im[e.indicator_id]?.code || ''}</a>` : ''}
      <small>${dt(e.evidence_date)} · ${nf(e.evidence_files.length)} ملف${e.external_url ? '' : ''}${e.description ? ' · ' + App.short(e.description, 80) : ''}</small>${e.review_note ? h`<small class="iw-note">${ic('alert')} ${e.review_note}</small>` : ''}${e.external_url ? h`<a href="${e.external_url}" target="_blank" rel="noopener">رابط خارجي</a>` : ''}</div>
    <div class="iw-ea">${sb_('evid', e.status)}${btn('معاينة', 'evView', { id: e.id, t: e.title }, 'sm')}${canReview() ? btn('مراجعة', 'evReview', { id: e.id }, 'sm') : ''}${co && e.indicator_id === id ? btn('حذف', 'evDel', { id: e.id }, 'sm bad') : ''}</div></li>`;
  const evid = h`<section class="iw-sec" id="s-evid" aria-labelledby="h-evid"><div class="iw-sh2"><h2 id="h-evid">${ic('clip')} ٢ · أرفق الشواهد</h2>${d.canUpload && active ? btn('+ رفع شاهد', 'evAdd', {}, 'pri') : ''}</div>
    <div class="iw-meter"><span><b>${nf(ap.length)}</b> معتمد</span><span><b>${nf(pend.length)}</b> قيد المراجعة</span><span class="${fix.length ? 'bad' : ''}"><b>${nf(fix.length)}</b> يحتاج استكمالاً</span><i><u style="width:${evAll.length ? ap.length / evAll.length * 100 : 0}%"></u></i></div>
    ${evAll.length ? h`<ul class="iw-evs">${[...fix, ...pend, ...evAll.filter(e => !fix.includes(e) && !pend.includes(e))].map(row)}</ul>` : h`<p class="muted empty">لم تُرفع شواهد فعلية بعد. ${d.canUpload && active ? 'ابدأ من زر «رفع شاهد» أو من الشواهد المقترحة أعلاه.' : ''}</p>`}</section>`;

  // 3) التقييم
  const f = k => ev?.[k] ?? '';
  const form = canEdit ? h`<div class="iw-form"><div class="iw-lvpick" role="radiogroup" aria-label="مستوى التقييم">${levels.map(l => h`<button type="button" class="iw-lv lv-${LVK[l.code] || 'x'}" role="radio" aria-checked="false" data-a="iwLevel" data-l="${l.id}" data-l-code="${l.code}"><b>${l.label}</b><small dir="ltr">${nf(l.min)} – ${nf(l.max)}%</small></button>`)}</div>
      <div class="iw-pr"><label for="iw-pct">نسبة التحقق (%)</label><input id="iw-pct" type="number" min="0" max="100" step="1" inputmode="numeric" value="${ev?.achievement_pct ?? ''}"><output id="iw-lvout" role="status"></output></div>
      ${ddf('just', 'مبررات التقييم', 4, f('justification'), 'مطلوبة قبل الإرسال')}
      <div class="iw-2">${ddf('str', 'جوانب القوة', 3, f('strengths'))}${ddf('gap', 'الفجوات والملاحظات', 3, f('gaps_notes'))}</div>
      ${ddf('src', 'مصادر البيانات', 2, f('data_sources'))}
      ${!ap.length ? h`<p class="iw-hint">${ic('alert')} لا توجد شواهد معتمدة بعد؛ تأكد أن المبررات تستند إلى شواهد مرفوعة.</p>` : ''}
      <div class="iw-act">${btn('حفظ كمسودة', 'iwSave', { s: 'draft' })}${btn('إرسال للاعتماد', 'iwSave', { s: 'submitted' }, 'pri')}${co || pr ? btn('اعتماد التقييم', 'iwSave', { s: 'approved' }, 'gold') : ''}</div></div>`
    : ev ? h`<dl class="iw-kv wide"><dt>المستوى</dt><dd>${cur ? cur.label : '—'} · ${pctTxt(ev.achievement_pct)}</dd><dt>مبررات التقييم</dt><dd>${ev.justification || '—'}</dd><dt>جوانب القوة</dt><dd>${ev.strengths || '—'}</dd><dt>الفجوات والملاحظات</dt><dd>${ev.gaps_notes || '—'}</dd><dt>مصادر البيانات</dt><dd>${ev.data_sources || '—'}</dd><dt>الاعتماد</dt><dd>${ev.approved_at ? dtt(ev.approved_at) : '—'}</dd></dl><p class="muted sm">${!active ? 'الدورة غير نشطة.' : 'التقييم للمقيّم المسند، ويُعدَّل بعد إعادته للمسودة من المنسق.'}</p>`
    : h`<p class="muted empty">لم يُسجَّل تقييم لهذا المؤشر في هذه الدورة. ${active ? 'التقييم للمقيّم المسند.' : ''}</p>`;
  const evalSec = h`<section class="iw-sec" id="s-eval" aria-labelledby="h-eval"><h2 id="h-eval">${ic('note')} ٣ · قيّم المؤشر</h2>${form}</section>`;

  // 4) الزيارات والمهام
  const visits = vc.length ? h`<div class="iw-vs">${vc.slice().sort((a, b) => String(b.technical_visits.visit_date).localeCompare(String(a.technical_visits.visit_date))).map(v => h`<div class="iw-v"><div class="iw-vh"><b>${dt(v.technical_visits.visit_date)}${v.technical_visits.target_party ? ' · ' + v.technical_visits.target_party : ''}</b><span>${sb_('visit', v.technical_visits.status)}${sb_('follow', v.followup)}<a class="btn sm" href="#visit/${v.visit_id}">فتح</a></span></div>
      <dl class="iw-kv wide">${v.gaps ? h`<dt>الفجوات</dt><dd>${v.gaps}</dd>` : ''}${v.recommendations ? h`<dt>التوصيات</dt><dd>${v.recommendations}</dd>` : ''}${v.required_actions ? h`<dt>الإجراءات المطلوبة</dt><dd>${v.required_actions}${v.due_date ? ' · ' + dt(v.due_date) : ''}</dd>` : ''}</dl></div>`)}</div>` : h`<p class="muted empty">لا زيارات فنية مرتبطة بهذا المؤشر.</p>`;
  const tasks = tk.length ? h`<ul class="iw-tk">${tk.map(t => h`<li><span>${t.title}</span><small>${t.assignee_staff_id ? App.pcell(t.assignee_staff_id, 18) : '—'} · ${dt(t.due_date)}</small>${sb_('task', t.status)}</li>`)}</ul>` : h`<p class="muted empty">لا مهام مرتبطة.</p>`;
  const follow = h`<section class="iw-sec" id="s-follow" aria-labelledby="h-follow"><h2 id="h-follow">${ic('visit')} ٤ · زيارات ومهام وموعد</h2>
    <div class="iw-g2"><div class="iw-c"><div class="iw-ch"><h3>الزيارات الفنية</h3>${co ? btn('+ إضافة زيارة', 'iwVisit', {}, 'sm pri') : ''}</div>${visits}<small class="muted">الزيارة لا تغيّر التقييم ولا تعتمد الشواهد.</small></div>
      <div class="iw-c"><div class="iw-ch"><h3>المهام</h3>${active ? btn(co ? '+ مهمة' : '+ اقتراح مهمة', 'iwTask', {}, 'sm pri') : ''}</div>${tasks}
        <div class="iw-due"><b>موعد إغلاق المؤشر:</b> ${d.due ? dt(d.due) : 'غير محدد'} ${co ? btn(d.dl[0] ? 'تمديد' : 'تحديد موعد', 'dlSet', {}, 'sm') : ''}</div></div></div></section>`;

  const grp = (xs, t) => xs.length ? h`<div class="iw-rel"><h3>${t}</h3><div>${xs.map(r => h`<a class="ilink" style="--b:var(--c${d.domC(r)}b);--f:var(--c${d.domC(r)}f)" href="#ind/${r.id}" title="${App.short(r.official_text, 90)}">${r.code}</a>`)}</div></div>` : '';
  const related = (d.linked.length || d.sibs.length) ? h`<details class="iw-sec more"><summary>${ic('grid')} مؤشرات مرتبطة <span class="bdg">${nf(d.linked.length + d.sibs.length)}</span></summary>${grp(d.linked.map(x => d.ref.im[x.href.slice(5)]).filter(Boolean), 'مرتبطة بالشواهد والزيارات')}${grp(d.sibs.map(x => d.ref.im[x.href.slice(5)]).filter(Boolean), 'مؤشرات المعيار نفسه')}</details>` : '';
  const log = d.logHtml ? h`<details class="iw-sec more"><summary>${ic('history')} سجل التعديلات والاعتمادات</summary>${raw(d.logHtml)}</details>` : '';
  return h`<div class="iw"><a class="iback" href="${d.back.href}">${d.back.label} ${ic('arrow')}</a>${head}${guide}${evid}${evalSec}${follow}${related}${log}</div>`;
};

// تنقّل داخلي بين الأقسام بلا تغيير عنوان الصفحة
document.addEventListener('click', e => {
  const a = e.target.closest('[data-jump]'); if (!a) return; e.preventDefault();
  const t = document.getElementById(a.dataset.jump); if (t) { t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
});
})();
