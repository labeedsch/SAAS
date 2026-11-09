/* مكتبي الإلكتروني: مكتب عضو فريق التقويم الشخصي. يحلّ محل «إدارة الفريق» و«إدارة المنصة» لهذا الدور،
   ويجمع مهامه المسندة إليه وما اقترحه ومؤشراته ومواعيده وتقويمه وإعلاناته. تُحمَّل بعد admin-team.js. */
(() => {
const { h, S, L, nf, dt, staffName, badge, btn, panel } = App;
const MS = 864e5, pad = n => String(n).padStart(2, '0');
const tod = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dayDiff = s => Math.round((new Date(String(s).slice(0, 10) + 'T00:00:00') - new Date(tod() + 'T00:00:00')) / MS);
const dueTxt = s => { const n = dayDiff(s); return n < 0 ? `متأخر ${nf(-n)} يوم` : n === 0 ? 'اليوم' : n === 1 ? 'غداً' : `بعد ${nf(n)} أيام`; };
const TABS = [['overview', 'مكتبي', '*', 'مهامك المسندة وما اقترحته ومؤشراتك ومواعيدك وتقويمك في مكان واحد.'], ['tasks', 'مهامي', '*', 'المهام المسندة إليك والمهام التي اقترحتها وتحديث حالتها وإرفاق مخرجاتها.'], ['meetings', 'اجتماعاتي', '*', 'الاجتماعات المدعو إليها وتأكيد الحضور أو الاعتذار والمحاضر والقرارات.'], ['visits', 'الزيارات الفنية', '*', 'الزيارات الفنية وبطاقات المؤشرات والإجراءات المطلوبة منك.'], ['cal', 'المواعيد والتقويم', '*', 'تقويم موحّد لاجتماعاتك ومهامك ومواعيد الإغلاق التي تخصّك.'], ['ann', 'الإعلانات', '*', 'إعلانات الفريق الموجّهة إليك.']];
(App.HUBS ||= {}).desk = { title: 'مكتبي الإلكتروني', tabs: TABS };
const isLate = t => t.status === 'overdue' || (t.due_date && dayDiff(t.due_date) < 0);
const open = t => !['completed', 'cancelled'].includes(t.status);

const taskRow = (t, mine) => {
  const acts = [];
  if (mine && t.approval === 'approved') {
    if (['new', 'overdue'].includes(t.status)) acts.push(btn('بدء', 'dbTkStart', { i: t.id }, 'sm'));
    if (['new', 'in_progress', 'overdue'].includes(t.status)) acts.push(btn('إرسال للمراجعة', 'dbTkSubmit', { i: t.id }, 'sm pri'));
  }
  const tone = isLate(t) ? 'bad' : t.status === 'awaiting_review' ? 'warn' : 'info', n = t.due_date ? dayDiff(t.due_date) : null;
  return h`<li class="db-it tk ${tone}"><span class="tk-dot" aria-hidden="true"></span><div class="db-itx"><b>${t.title}</b><div class="tk-meta"><span class="tk-st">${t.approval === 'approved' ? L.task[t.status] : (L.appr[t.approval] || 'بانتظار القرار')}</span>${t.due_date ? h`<span class="tk-due ${n < 0 ? 'bad' : n <= 1 ? 'warn' : ''}">${App.ico('clock')} ${dt(t.due_date)} · ${dueTxt(t.due_date)}</span>` : h`<span class="tk-due none">بلا موعد</span>`}</div></div>${acts.length ? h`<div class="db-ia">${acts}</div>` : ''}</li>`;
};

async function overview() {
  const nc = App.needCycle(); if (nc) return nc;
  const [D] = await Promise.all([App.data(), App.alerts()]);
  const me = S.me.staff_id, T = tod(), who = S.me.display_name || staffName(me) || '';
  const mineT = D.tasks.filter(t => t.assignee_staff_id === me && t.approval === 'approved'), act = mineT.filter(open);
  const run = act.filter(t => ['new', 'in_progress', 'overdue'].includes(t.status) && !isLate(t)), late = act.filter(isLate), rev = act.filter(t => t.status === 'awaiting_review'), done = mineT.filter(t => t.status === 'completed');
  const prop = D.tasks.filter(t => t.proposed_by === S.me.id && (t.approval !== 'approved' || t.assignee_staff_id !== me));
  const inds = new Map(); D.resp.filter(r => r.staff_id === me).forEach(r => { const o = inds.get(r.indicator_id) || { id: r.indicator_id, ev: false, rs: false }; o[r.kind === 'evaluator' ? 'ev' : 'rs'] = true; inds.set(r.indicator_id, o); });
  const mi = [...inds.values()].map(o => ({ ...o, i: D.ref.im[o.id], st: D.om[o.id]?.eval_status || 'not_evaluated', ec: D.om[o.id]?.evidence_count })).filter(o => o.i).sort((a, b) => String(a.i.code).localeCompare(String(b.i.code), undefined, { numeric: true }));
  const evDone = mi.filter(o => o.st === 'approved').length;
  const myProp = D.tasks.filter(t => t.proposed_by === S.me.id), propOk = myProp.filter(t => t.approval === 'approved');
  const rsvp = D.inv.filter(i => i.staff_id === me && i.rsvp === 'pending' && D.meetings.some(m => m.id === i.meeting_id && m.status === 'scheduled' && dayDiff(m.meeting_date) >= 0));
  const needFix = D.evid.filter(e => e.status === 'needs_completion' && inds.has(e.indicator_id));
  const reads = new Set(D.reads.filter(r => r.profile_id === S.me.id).map(r => r.announcement_id)), unread = D.anns.filter(a => !reads.has(a.id));
  const pct = (a, b) => b ? a / b * 100 : 0, kc = App.kc, win = App.win;
  const sorted = xs => [...xs].sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9'));
  const list = (xs, mine, empty) => xs.length ? h`<ul class="tm-ul">${sorted(xs).slice(0, 6).map(t => taskRow(t, mine))}</ul>${xs.length > 6 ? h`<a class="db-more" href="#desk/tasks">+ ${nf(xs.length - 6)} أخرى</a>` : ''}` : h`<p class="muted empty">${empty}</p>`;
  const strip = D.anns.slice().sort((a, b) => (b.priority !== 'normal') - (a.priority !== 'normal')), greet = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
  return h`${App.svcBar(false, 'team_member')}
  ${strip.length ? h`<div class="db-strip" role="region" aria-label="الإعلانات">${App.ico('mega')}<div>${strip.slice(0, 5).map(a => h`<a href="#desk/ann" class="${a.priority}">${a.priority !== 'normal' ? h`<b>${L.prio[a.priority]}:</b> ` : ''}${a.title}${!reads.has(a.id) ? h` <i class="db-dot" title="لم تطّلع عليه"></i>` : ''}</a>`)}</div><a class="btn sm" href="#desk/ann">كل الإعلانات</a></div>` : ''}
  <section class="db-hero cmp desk"><div class="db-ht"><small>أهلاً بك في مكتبك الإلكتروني</small><div class="deskwho">${App.avatarHtml(App.S.staff.find(x => x.id === App.S.me.staff_id) || { display_name: who }, 64)}<h1>${who ? greet + '، ' + who : greet}</h1></div>
    <p class="muted">${App.cycle()?.name || ''} — ما أُسند إليك، وما اقترحته، وما ينتظرك اليوم.</p>
    <div class="chips"><a class="db-chip ${late.length ? 'warn' : 'ok'}" href="#desk/tasks">${App.ico('task')} ${late.length ? nf(late.length) + ' مهام متأخرة' : 'لا مهام متأخرة'}</a>${rsvp.length ? h`<a class="db-chip warn" href="#desk/meetings">${App.ico('cal')} ${nf(rsvp.length)} دعوة تنتظر ردّك</a>` : ''}${needFix.length ? h`<a class="db-chip warn" href="#inds/evidence/needs_completion">${App.ico('clip')} ${nf(needFix.length)} شواهد تحتاج استكمالاً</a>` : ''}</div></div></section>
  <div class="kcs">${kc('info', 'task', 'مهامي الجارية', nf(run.length), pct(run.length, act.length), `${nf(act.length)} مهمة نشطة مسندة إليّ`, '#desk/tasks')}${kc('bad', 'alert', 'متأخرة', nf(late.length), pct(late.length, act.length), 'تجاوزت موعدها', '#desk/tasks')}${kc('warn', 'clock', 'بانتظار المراجعة', nf(rev.length), pct(rev.length, act.length), 'أرسلتها للمنسق', '#desk/tasks')}${kc('ok', 'check', 'مكتملة', nf(done.length), pct(done.length, mineT.length), `من ${nf(mineT.length)} مهمة`, '#desk/tasks')}${kc('teal', 'flag', 'مؤشراتي', nf(mi.length), pct(evDone, mi.length), `${nf(evDone)} معتمد`, '#inds/list')}${kc('d2', 'note', 'مهام اقترحتها', nf(myProp.length), pct(propOk.length, myProp.length), `${nf(propOk.length)} اعتُمدت من المنسق`, '#desk/tasks')}</div>
  <div class="wins d3 desk3">
    <section class="win w-cal"><header><span class="db-gi">${App.ico('cal')}</span><h2>التقويم والأجندة</h2><a class="btn sm" href="#desk/cal">تقويمي</a></header><div class="wc">${App.calWin(D)}</div></section>
    ${win('dwin t-task', 'task', h`المهام المسندة إليّ <span class="cnt">${nf(act.length)}</span>`, '#desk/tasks', 'كل مهامي', list(act, true, 'لا مهام نشطة مسندة إليك الآن.'))}
    ${win('dwin t-prop', 'note', h`مهام اقترحتها <span class="cnt">${nf(prop.length)}</span>`, '#desk/tasks', 'اقتراح مهمة', list(prop, false, 'لم تقترح مهام بعد، أو لا مقترحات بانتظار القرار.'))}
    ${win('dwin t-ind', 'flag', h`مؤشراتي <span class="cnt">${nf(mi.length)}</span>`, '#inds/list', 'إدارة المؤشرات', mi.length ? h`<ul class="wl">${mi.slice(0, 8).map(o => h`<li><a class="ix" href="#ind/${o.id}"><span class="ix-c">${o.i.code}</span><span class="ix-t">${App.short(o.i.official_text, 70)}</span><span class="ix-m">${o.ev ? h`<span class="ix-r ev">مقيّم</span>` : ''}${o.rs ? h`<span class="ix-r rs">مسؤول</span>` : ''}${badge(L.eval[o.st], o.st === 'approved' ? 'ok' : o.st === 'submitted' ? 'warn' : '')}</span></a></li>`)}</ul>${mi.length > 8 ? h`<a class="db-more" href="#inds/list">+ ${nf(mi.length - 8)} أخرى</a>` : ''}` : h`<p class="muted empty">لم يُسنَد إليك مؤشر في هذه الدورة بعد.</p>`)}
  </div>`;
}

Pages.desk = async (parts = []) => {
  const tab = TABS.some(t => t[0] === parts[0]) ? parts[0] : 'overview';
  if (tab === 'tasks') App.taskFilter?.('mine');
  const [r, D] = await Promise.all([tab === 'overview' ? overview() : Pages[tab](parts.slice(1)), S.cid ? App.data().catch(() => null) : null]);
  const me = S.me.staff_id, bg = D ? { tasks: D.tasks.filter(t => t.approval === 'approved' && t.assignee_staff_id === me && ['new', 'in_progress', 'overdue'].includes(t.status)).length,
    meetings: D.inv.filter(i => i.staff_id === me && i.rsvp === 'pending').length } : {};
  return App.shell('مكتبي الإلكتروني', 'مهامي ومواعيدي', 'desk', TABS, tab, bg, '', r?.html || r, r?.after);
};
})();
