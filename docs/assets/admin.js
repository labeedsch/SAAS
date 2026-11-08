/* غلاف لوحة التحكم: الدخول، القائمة، التوجيه، الإجراءات */
(() => {
const { sb, h, raw, $, $$, put, S, toast, run, role, isCoord, L } = App;



const MENU = [
  ['dashboard', 'لوحة المتابعة', '*'],
  ['grp', 'التقويم'],
  ['inds', 'المؤشرات والتقييم', '*'],
  ['evidence', 'الشواهد', '*'],
  ['assign', 'المسؤوليات', ['coordinator', 'principal']],
  ['grp', 'فريق التقويم'],
  ['meetings', 'الاجتماعات', '*'],
  ['visits', 'الزيارات الفنية', '*'],
  ['tasks', 'المهام والتكليفات', '*'],
  ['ann', 'الإعلانات', '*'],
  ['cal', 'التقويم والمواعيد', '*'],
  ['grp', 'الإدارة'],
  ['reports', 'التقارير', '*'],
  ['cycles', 'دورات التقويم', ['coordinator', 'principal', 'reviewer']],
  ['staff', 'المنسوبون والحسابات', ['coordinator']],
  ['wa', 'واتساب', ['coordinator']],
  ['log', 'سجل النشاط', ['coordinator', 'principal']],
];
const allowed = (r) => r === '*' || r.includes(role());

function drawMenu() {
  const cur = location.hash.slice(1).split('/')[0] || 'dashboard';
  put($('#menu'), h`${MENU.filter(m => m[0] === 'grp' || allowed(m[2])).map(m => m[0] === 'grp' ? h`<div class="grp">${m[1]}</div>` : h`<a href="#${m[0]}" class="${m[0] === cur ? 'on' : ''}">${m[1]}</a>`)}`);
}

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
}
function drawCycles() {
  put($('#cycSel'), h`${S.cycles.length ? S.cycles.map(c => h`<option value="${c.id}" ${c.id === S.cid ? raw('selected') : ''}>${c.name} — ${L.cycle[c.status]}</option>`) : h`<option value="">لا توجد دورة</option>`}`);
}
App.reloadCycles = async () => { const r = await sb.from('cycles').select('*').order('created_at', { ascending: false }); S.cycles = r.data || []; if (!S.cycles.find(c => c.id === S.cid)) S.cid = S.cycles[0]?.id || null; drawCycles(); };
App.reloadStaff = async () => { const r = await sb.from('staff').select('*').order('full_name'); S.staff = r.data || []; };

function showLogin(msg = '') {
  $('#shell').hidden = true; const el = $('#login'); el.hidden = false;
  put(el, h`<div class="login"><div class="pn"><h1 style="font-size:1.3rem;margin-bottom:6px">لوحة التقويم الذاتي</h1><p class="muted">مدرسة لبيد بن ربيعة المتوسطة. دخول المنسق وفريق التقويم.</p>
    <form class="frm" id="lf"><label class="fld"><span>البريد الإلكتروني</span><input id="le" type="email" required autocomplete="username" dir="ltr"></label>
    <label class="fld"><span>كلمة المرور</span><input id="lp" type="password" required autocomplete="current-password" dir="ltr"></label>
    <div class="err" id="lerr" role="alert">${msg}</div><button class="btn pri" type="submit">دخول</button></form>
    <p class="muted" style="margin-top:12px"><a href="./">العودة إلى الموقع العام</a></p></div></div>`);
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: $('#le').value.trim(), password: $('#lp').value });
    if (error) { $('#lerr').textContent = 'بيانات الدخول غير صحيحة.'; return; }
    boot();
  };
}

async function route() {
  const parts = location.hash.slice(1).split('/'); const name = parts[0] || 'dashboard';
  drawMenu(); $('#side').classList.remove('open');
  const m = MENU.find(x => x[0] === name);
  const view = $('#view');
  if (!Pages[name] || (m && !allowed(m[2]))) { put(view, h`<div class="pn"><p>الصفحة غير متاحة لدورك.</p></div>`); return; }
  put(view, h`<p class="muted">جارٍ التحميل…</p>`);
  try {
    const r = await Pages[name](parts.slice(1));
    put(view, r.html || r); if (r.after) r.after(view);
  } catch (e) { console.error(e); put(view, h`<div class="pn"><p class="err">تعذّر تحميل الصفحة: ${App.errMsg(e)}</p></div>`); }
  window.scrollTo(0, 0);
}
App.refresh = async () => { const y = window.scrollY; await route(); window.scrollTo(0, y); };

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = Act[el.dataset.a]; if (!fn) return;
  el.disabled = true;
  try { await fn({ ...el.dataset }, el); } catch (err) { console.error(err); toast(App.errMsg(err), true); }
  finally { el.disabled = false; }
});
$('#cycSel').onchange = e => { S.cid = e.target.value || null; try { localStorage.setItem('cyc', S.cid || ''); } catch {} route(); };
$('#out').onclick = async () => { await sb.auth.signOut(); S.me = null; showLogin(); };
$('#burger').onclick = () => $('#side').classList.toggle('open');
window.addEventListener('hashchange', route);
Act.print = () => window.print();
Act.back = () => history.back();
boot();
})();
