(() => {
const sb = App.sb;
const $ = s => document.querySelector(s), view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LV = { 'التميز':'excellence','التقدم':'advancement','الانطلاق':'launch','التهيئة':'preparation' };
const lvl = l => `<span class="lvl ${LV[l]||'none'}">${esc(l||'غير مُقيَّم')}</span>`;
const num = n => Number(n).toLocaleString('ar-SA');
const DCOL = ['--c0f','--c1f','--c2f','--c4f'];
let rows = [], session = null, role = null;

async function load() {
  const { data, error } = await sb.from('public_results').select('*').order('indicator_code');
  if (error) throw error; rows = data || [];
  const { data: s } = await sb.auth.getSession(); session = s.session;
  role = null;
  if (session) { const { data: p } = await sb.from('profiles').select('role,display_name').eq('id', session.user.id).maybeSingle(); role = p; }
  $('#loginLink').textContent = session ? 'خروج' : 'دخول';
  $('#adminLink').hidden = !(role && ['coordinator','team_member','principal','reviewer'].includes(role.role));
}
const cycles = () => [...new Map(rows.map(r => [r.cycle_id, r.cycle_name]))];
const byCycle = id => rows.filter(r => r.cycle_id === id);
const pubCount = rs => rs.filter(r => r.publish_state === 'published').length;
const sortCodes = (a, b) => a.localeCompare(b, 'en', { numeric: true });

function crumbs(parts) { return `<div class="crumbs">${parts.map(p => p[1] ? `<a href="${p[1]}">${esc(p[0])}</a>` : esc(p[0])).join(' ‹ ')}</div>`; }
function noResults() { return `<div class="panel"><h2>لا توجد نتائج منشورة بعد</h2><p class="muted">تُنشر نتائج التقويم الذاتي هنا بعد اعتمادها من منسق التقويم.</p></div>`; }

function home() {
  const cs = cycles(); const first = cs[0];
  const rs = first ? byCycle(first[0]) : [];
  view.innerHTML = `<section class="hero"><div><span class="chip">التقويم الذاتي المدرسي</span>
    <h1>نتائج <span>التقويم الذاتي</span><br>مدرسة لبيد بن ربيعة المتوسطة</h1>
    <p>بوابة شفافة لعرض مجالات التقويم الذاتي ومعاييره ومؤشراته ونتائجه المعتمدة، وفق الدليل الإجرائي للتقويم المدرسي الذاتي – هيئة تقويم التعليم والتدريب.</p>
    <p><a class="btn pri" href="#results">استعرض النتائج</a></p></div>
    <div class="tiles"><div class="tile"><b>${num(4)}</b><span>مجالات</span></div><div class="tile"><b>${num(11)}</b><span>معياراً</span></div><div class="tile"><b>${num(first ? rs.length : 49)}</b><span>مؤشراً</span></div>
    <div class="tile" style="grid-column:1/-1"><b>${first ? num(pubCount(rs)) + ' / ' + num(rs.length) : '—'}</b><span>${first ? 'مؤشرات منشورة في ' + esc(first[1]) : 'لا توجد دورة منشورة'}</span></div></div></section>`;
}

function results() {
  const cs = cycles();
  if (!cs.length) { view.innerHTML = noResults(); return; }
  view.innerHTML = `<div class="sec"><h2>نتائج التقويم</h2></div><div class="grid">${cs.map(([id, name]) => {
    const rs = byCycle(id), p = pubCount(rs);
    return `<a class="card" href="#cycle/${id}"><h3>${esc(name)}</h3><span class="muted">${num(p)} من ${num(rs.length)} مؤشراً منشور</span><div class="bar"><span style="width:${rs.length ? p / rs.length * 100 : 0}%"></span></div></a>`;
  }).join('')}</div>`;
}

function cycle(id) {
  const rs = byCycle(id); if (!rs.length) { view.innerHTML = noResults(); return; }
  const doms = [...new Map(rs.map(r => [r.domain_id, r]))].map(([, r]) => r).sort((a, b) => sortCodes(a.domain_code, b.domain_code));
  view.innerHTML = crumbs([['النتائج', '#results'], [rs[0].cycle_name]]) + `<div class="grid">${doms.map((d, i) => {
    const dr = rs.filter(r => r.domain_id === d.domain_id), p = pubCount(dr);
    return `<a class="card" style="--f:var(${DCOL[i % 4]})" href="#domain/${id}/${d.domain_id}"><h3>${esc(d.domain_name)}</h3>
      <span class="muted">${num(p)} من ${num(dr.length)} مؤشراً منشور</span><div class="bar"><span style="width:${p / dr.length * 100}%"></span></div></a>`;
  }).join('')}</div>`;
}

function domain(cid, did) {
  const rs = byCycle(cid).filter(r => r.domain_id === did); if (!rs.length) { view.innerHTML = noResults(); return; }
  const sts = [...new Map(rs.map(r => [r.standard_id, r]))].map(([, r]) => r).sort((a, b) => sortCodes(a.standard_code, b.standard_code));
  view.innerHTML = crumbs([['النتائج', '#results'], [rs[0].cycle_name, '#cycle/' + cid], [rs[0].domain_name]]) +
    sts.map(s => `<div class="sec"><h2>${esc(s.standard_name)}</h2></div>` + rs.filter(r => r.standard_id === s.standard_id).sort((a, b) => sortCodes(a.indicator_code, b.indicator_code)).map(r =>
      `<a class="ind" href="#ind/${cid}/${r.indicator_id}"><code>${esc(r.indicator_code)}</code><p>${esc(r.official_text)}</p>${r.publish_state === 'published' ? `${lvl(r.level_label)} <span class="pct">${num(r.achievement_pct)}٪</span>` : '<span class="lvl none">غير منشور</span>'}</a>`).join('')).join('');
}

async function indicator(cid, iid) {
  const r = byCycle(cid).find(x => x.indicator_id === iid); if (!r) { view.innerHTML = noResults(); return; }
  const { count } = await sb.from('public_evidence_stubs').select('id', { count: 'exact', head: true }).eq('cycle_id', cid).eq('indicator_id', iid).eq('status', 'approved');
  const pub = r.publish_state === 'published';
  view.innerHTML = crumbs([['النتائج', '#results'], [r.cycle_name, '#cycle/' + cid], [r.domain_name, `#domain/${cid}/${r.domain_id}`], [r.indicator_code]]) +
    `<div class="panel"><div class="sec" style="margin:0"><h2>المؤشر ${esc(r.indicator_code)}</h2>${pub ? lvl(r.level_label) : '<span class="lvl none">غير منشور</span>'}</div>
      <p>${esc(r.official_text)}</p><p class="muted">${esc(r.domain_name)} ‹ ${esc(r.standard_name)}</p></div>` +
    (pub ? `<div class="panel"><h2>نسبة التحقق</h2><p class="pct" style="font-size:1.8rem;margin:0">${num(r.achievement_pct)}٪</p></div>
      <div class="panel"><h2>مبررات التقييم</h2><p>${esc(r.justification || '—')}</p>${r.strengths ? `<h2>جوانب القوة</h2><p>${esc(r.strengths)}</p>` : ''}</div>`
      : `<div class="panel"><p class="muted">لم يُنشر تقييم هذا المؤشر بعد.</p></div>`) +
    (count ? `<div class="panel"><h2>الشواهد (${num(count)})</h2>${await evidenceBlock(cid, iid)}</div>` : '');
}
async function evidenceBlock(cid, iid) {
  if (role && ['external_evaluator','coordinator','team_member','principal','reviewer'].includes(role.role)) {
    const { data } = await sb.from('evidence').select('id,title,description,evidence_date,category').eq('cycle_id', cid).eq('indicator_id', iid).eq('status', 'approved');
    if (!data?.length) return `<p class="muted">لا توجد شواهد معتمدة معروضة.</p>`;
    return `<div class="ev-list">${data.map(e => `<div class="ind" style="align-items:center"><p><b>${esc(e.title)}</b>${e.description ? `<br><small class="muted">${esc(e.description)}</small>` : ''}</p><button type="button" class="btn sm pri" data-ev="${esc(e.id)}" data-t="${esc(e.title)}">معاينة</button></div>`).join('')}</div>`;
  }
  return `<div class="lock"><svg class="ico" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg><span>الشاهد محجوب حفاظاً على خصوصية البيانات، والاطلاع عليه متاح للمستخدمين المصرح لهم.</span></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-ev]'); if (b) App.openViewer(b.dataset.ev, b.dataset.t, true); });

function login() {
  if (session) { sb.auth.signOut().then(() => { location.hash = '#home'; boot(); }); return; }
  view.innerHTML = `<div class="panel" style="max-width:480px;margin-inline:auto"><h2>تسجيل الدخول</h2><p class="muted">للمقيم الخارجي وأعضاء فريق التقويم.</p>
    <form class="f" id="lf"><label>البريد الإلكتروني<input type="email" name="e" required autocomplete="username" dir="ltr"></label>
    <label>كلمة المرور<input type="password" name="p" required autocomplete="current-password" dir="ltr"></label>
    <button class="btn pri" type="submit">دخول</button><div class="err" id="le" role="alert"></div></form></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await sb.auth.signInWithPassword({ email: f.get('e'), password: f.get('p') });
    if (error) { $('#le').textContent = 'بيانات الدخول غير صحيحة.'; return; }
    location.hash = '#home'; boot();
  };
}

function route() {
  const [h, a, b] = location.hash.slice(1).split('/');
  document.querySelectorAll('#nav a').forEach(x => x.classList.toggle('on', x.dataset.n === (h || 'home') || (x.dataset.n === 'results' && ['cycle','domain','ind'].includes(h))));
  window.scrollTo(0, 0);
  ({ '': home, home, results, login }[h] || (() => ({ cycle: () => cycle(a), domain: () => domain(a, b), ind: () => indicator(a, b) }[h] || home)()))();
}
async function boot() { try { await load(); route(); } catch (e) { view.innerHTML = `<div class="panel"><p class="err">تعذّر تحميل البيانات. أعد المحاولة لاحقاً.</p></div>`; console.error(e); } }
window.addEventListener('hashchange', route);
boot();
})();
