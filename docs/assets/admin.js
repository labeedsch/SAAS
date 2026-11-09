/* غلاف لوحة التحكم: الدخول، القائمة، التوجيه، الإجراءات */
(() => {
const { sb, h, raw, $, $$, put, S, toast, run, role, isCoord, L } = App;



const CP = ['coordinator', 'principal'], CPR = ['coordinator', 'principal', 'reviewer'];
// القائمة العلوية: أربعة أقسام رئيسية فقط. الصفحات الداخلية (علامة 1) تُعرض كتبويبات داخل قسمها وتبقى روابطها القديمة تعمل وصلاحياتها كما هي
const MENU = [
  ['dashboard', 'لوحة متابعة شاملة', '*'],
  ['inds', 'إدارة المؤشرات', '*'],
  ['team', 'إدارة الفريق', '*'],
  ['platform', 'إدارة المنصة', '*'],
  ['alerts', 'التنبيهات', '*', 1], ['reports', 'التقارير', '*', 1], ['log', 'سجل النشاط', CP, 1],
  ['evidence', 'الشواهد', '*', 1], ['indmap', 'خريطة التقدم', '*', 1],
  ['cycles', 'دورات التقويم', CPR, 1], ['wa', 'واتساب', ['coordinator'], 1],
  ['staff', 'المنسوبون والحسابات', ['coordinator'], 1], ['assign', 'المسؤوليات', CP, 1], ['ann', 'الإعلانات', '*', 1],
  ['meetings', 'الاجتماعات', '*', 1], ['visits', 'الزيارات الفنية', '*', 1], ['tasks', 'المهام والتكليفات', '*', 1], ['cal', 'التقويم والمواعيد', '*', 1],
];
// اسم الصفحة الداخلية ← القسم الذي يحويها
const HUB_OF = { alerts: 'dashboard', reports: 'dashboard', log: 'dashboard', evidence: 'inds', indmap: 'inds', ind: 'inds', cycles: 'platform', wa: 'platform', staff: 'platform', assign: 'platform', ann: 'platform', tasks: 'team', meetings: 'team', meeting: 'team', visits: 'team', visit: 'team', cal: 'team' };
const allowed = (r) => r === '*' || r.includes(role());

// القائمة العلوية: عناصر قبل أول مجموعة تظهر مباشرة، وكل مجموعة تُفتح كقائمة منسدلة
function drawMenu() {
  const cur0 = location.hash.slice(1).split('/')[0] || 'dashboard', cur = HUB_OF[cur0] || cur0;
  const nb = App.hubBadges ? App.hubBadges(App.lastAlerts) : {};
  put($('#menu'), h`${MENU.filter(m => !m[3] && allowed(m[2])).map(m => h`<a href="#${m[0]}" class="${m[0] === cur ? 'on' : ''}" ${m[0] === cur ? raw('aria-current="page"') : ''}>${m[1]}${nb[m[0]] ? h` <span class="nb" aria-label="${nb[m[0]]} إجراء">${nb[m[0]] > 99 ? '99+' : nb[m[0]]}</span>` : ''}</a>`)}`);
}
App.drawMenu = drawMenu;

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return showLogin();
  const { data: me } = await sb.from('profiles').select('id,role,staff_id,display_name,is_active').eq('id', session.user.id).maybeSingle();
  if (!me || !me.is_active || me.role === 'external_evaluator') {
    await sb.auth.signOut();
    return showLogin(me?.role === 'external_evaluator' ? 'حساب المقيم الخارجي يدخل من الموقع العام وليس من لوحة التحكم.' : 'هذا الحساب غير مفعّل أو غير مرتبط بدور.');
  }
  S.me = me;
  const [cyc, stf] = await Promise.all([
    sb.from('cycles').select('*').order('created_at', { ascending: false }),
    sb.from('staff').select('*').order('full_name'),
  ]);
  S.cycles = cyc.data || []; S.staff = stf.data || [];
  const saved = (() => { try { return localStorage.getItem('cyc'); } catch { return null; } })();
  S.cid = S.cycles.find(c => c.id === saved)?.id || (S.cycles.find(c => c.status === 'active') || S.cycles[0])?.id || null;
  drawCycles();
  $('#login').hidden = true; $('#shell').hidden = false;
  put($('#who'), h`${me.display_name || ''} · ${L.role[me.role]}`);
  route();
  App.alerts().then(drawMenu).catch(() => {});
}
function drawCycles() {
  put($('#cycSel'), h`${S.cycles.length ? S.cycles.map(c => h`<option value="${c.id}" ${c.id === S.cid ? raw('selected') : ''}>${c.name} — ${L.cycle[c.status]}</option>`) : h`<option value="">لا توجد دورة</option>`}`);
}
App.reloadCycles = async () => { const r = await sb.from('cycles').select('*').order('created_at', { ascending: false }); S.cycles = r.data || []; if (!S.cycles.find(c => c.id === S.cid)) S.cid = S.cycles[0]?.id || null; drawCycles(); };
App.reloadStaff = async () => { const r = await sb.from('staff').select('*').order('full_name'); S.staff = r.data || []; };

function showLogin(msg = '') {
  $('#shell').hidden = true; const el = $('#login'); el.hidden = false;
  put(el, h`<div class="login"><div class="pn"><h1 style="font-size:1.3rem;margin-bottom:6px">لوحة التقويم الذاتي</h1><p class="muted">مدرسة لبيد بن ربيعة المتوسطة. دخول المنسق وفريق التقويم.</p>
    <form class="frm" id="lf"><label class="fld"><span>اسم المستخدم أو البريد الإلكتروني</span><input id="le" type="text" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" dir="ltr"></label>
    <label class="fld"><span>كلمة المرور</span><input id="lp" type="password" required autocomplete="current-password" dir="ltr"></label>
    <div class="err" id="lerr" role="alert">${msg}</div><button class="btn pri" type="submit">دخول</button></form>
    <p class="muted" style="margin-top:12px"><a href="./">العودة إلى الموقع العام</a></p></div></div>`);
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: App.loginEmail($('#le').value), password: $('#lp').value });
    if (error) { $('#lerr').textContent = 'بيانات الدخول غير صحيحة.'; return; }
    boot();
  };
}

async function route() {
  const parts = location.hash.slice(1).split('/'); let name = parts[0] || 'dashboard', args = parts.slice(1);
  drawMenu();
  const m = MENU.find(x => x[0] === name);               // الصلاحية تُفحص على الاسم الأصلي قبل التحويل إلى تبويب
  const hub = HUB_OF[name];
  if (!['ind', 'meeting', 'visit'].includes(name) && hub && Pages[hub] && (!m || allowed(m[2]))) { args = [name === 'indmap' ? 'map' : name, ...args]; name = hub; }
  const view = $('#view');
  if (!Pages[name] || (m && !allowed(m[2]))) { put(view, h`<div class="pn"><p>الصفحة غير متاحة لدورك.</p></div>`); return; }
  put(view, h`<p class="muted">جارٍ التحميل…</p>`);
  try {
    const r = await Pages[name](args);
    const body = r.html || r, dc = App.cycle(), banner = dc?.name === 'الدورة التجريبية' && !dc.results_published
      ? raw(`<div class="demobar" role="status"><span>أنت تعرض <b>الدورة التجريبية</b>: كل ما فيها بيانات تجريبية للمعاينة وغير منشورة.</span>${isCoord() ? '<button type="button" class="btn sm bad" data-a="demoClear">حذف البيانات التجريبية</button>' : ''}</div>`) : '';
    put(view, banner ? h`${banner}${body}` : body); if (r.after) r.after(view);
  } catch (e) { console.error(e); put(view, h`<div class="pn"><p class="err">تعذّر تحميل الصفحة: ${App.errMsg(e)}</p></div>`); }
  window.scrollTo(0, 0);
}
App.refresh = async () => { const y = window.scrollY; App.dropCache?.(); await route(); window.scrollTo(0, y); };

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = Act[el.dataset.a]; if (!fn) return;
  el.disabled = true;
  try { await fn({ ...el.dataset }, el); } catch (err) { console.error(err); toast(App.errMsg(err), true); }
  finally { el.disabled = false; }
});
$('#cycSel').onchange = e => { S.cid = e.target.value || null; try { localStorage.setItem('cyc', S.cid || ''); } catch {} route(); };
$('#out').onclick = async () => { await sb.auth.signOut(); S.me = null; showLogin(); };
window.addEventListener('hashchange', route);
Act.print = () => window.print();
Act.back = () => history.back();
boot();
})();
