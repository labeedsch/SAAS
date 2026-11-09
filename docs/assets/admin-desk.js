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
  return h`<li class="db-it ${isLate(t) ? 'bad' : t.status === 'awaiting_review' ? 'warn' : 'info'}"><div class="db-itx"><b>${t.title}</b><small>${t.approval === 'approved' ? L.task[t.status] : L.appr[t.approval]}${t.due_date ? ' · ' + dt(t.due_date) + ' · ' + dueTxt(t.due_date) : ' · بلا موعد'}</small></div><div class="db-ia">${acts}</div></li>`;
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
  const rsvp = D.inv.filter(i => i.staff_id === me && i.rsvp === 'pending' && D.meetings.some(m => m.id === i.meeting_id && m.status === 'scheduled' && dayDiff(m.meeting_date) >= 0));
  const needFix = D.evid.filter(e => e.status === 'needs_completion' && inds.has(e.indicator_id));
  const reads = new Set(D.reads.filter(r => r.profile_id === S.me.id).map(r => r.announcement_id)), unread = D.anns.filter(a => !reads.has(a.id));
  const pct = (a, b) => b ? a / b * 100 : 0, kc = App.kc, win = App.win;
  const sorted = xs => [...xs].sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9'));
  const list = (xs, mine, empty) => xs.length ? h`<ul class="tm-ul">${sorted(xs).slice(0, 6).map(t => taskRow(t, mine))}</ul>${xs.length > 6 ? h`<a class="db-more" href="#desk/tasks">+ ${nf(xs.length - 6)} أخرى</a>` : ''}` : h`<p class="muted empty">${empty}</p>`;
  return h`${App.svcBar(false, 'team_member')}
  <section class="db-hero cmp desk"><div class="db-ht"><small>مكتبي الإلكتروني</small><h1>${who ? 'أهلاً ' + who : 'مكتبي'}</h1>
    <p class="muted">${App.cycle()?.name || ''} — ما أُسند إليك، وما اقترحته، وما ينتظرك اليوم.</p>
    <div class="chips"><a class="db-chip ${late.length ? 'warn' : 'ok'}" href="#desk/tasks">${App.ico('task')} ${late.length ? nf(late.length) + ' مهام متأخرة' : 'لا مهام متأخرة'}</a>${rsvp.length ? h`<a class="db-chip warn" href="#desk/meetings">${App.ico('cal')} ${nf(rsvp.length)} دعوة تنتظر ردّك</a>` : ''}${needFix.length ? h`<a class="db-chip warn" href="#inds/evidence/needs_completion">${App.ico('clip')} ${nf(needFix.length)} شواهد تحتاج استكمالاً</a>` : ''}</div></div></section>
  <div class="kcs">${kc('info', 'task', 'مهامي الجارية', nf(run.length), pct(run.length, act.length), `${nf(act.length)} مهمة نشطة مسندة إليّ`, '#desk/tasks')}${kc('bad', 'alert', 'متأخرة', nf(late.length), pct(late.length, act.length), 'تجاوزت موعدها', '#desk/tasks')}${kc('warn', 'clock', 'بانتظار المراجعة', nf(rev.length), pct(rev.length, act.length), 'أرسلتها للمنسق', '#desk/tasks')}${kc('ok', 'check', 'مكتملة', nf(done.length), pct(done.length, mineT.length), `من ${nf(mineT.length)} مهمة`, '#desk/tasks')}${kc('teal', 'note', 'مؤشراتي', nf(mi.length), pct(evDone, mi.length), `${nf(evDone)} معتمد`, '#inds/list')}</div>
  <div class="wins">
    ${win('', 'task', 'المهام المسندة إليّ', '#desk/tasks', 'كل مهامي', list(act, true, 'لا مهام نشطة مسندة إليك الآن.'))}
    ${win('', 'note', 'مهام اقترحتها', '#desk/tasks', 'اقتراح مهمة', list(prop, false, 'لم تقترح مهام بعد، أو لا مقترحات بانتظار القرار.'))}
    ${win('', 'flag', 'مؤشراتي', '#inds/list', 'إدارة المؤشرات', mi.length ? h`<ul class="wl">${mi.slice(0, 8).map(o => h`<li><a href="#ind/${o.id}"><b>${o.i.code}</b> <span>${App.short(o.i.official_text, 60)}</span> ${badge(L.eval[o.st], o.st === 'approved' ? 'ok' : o.st === 'submitted' ? 'warn' : '')}<small>${o.ev ? 'مقيّم' : ''}${o.ev && o.rs ? ' + ' : ''}${o.rs ? 'مسؤول' : ''}</small></a></li>`)}</ul>${mi.length > 8 ? h`<a class="db-more" href="#inds/list">+ ${nf(mi.length - 8)} أخرى</a>` : ''}` : h`<p class="muted empty">لم يُسنَد إليك مؤشر في هذه الدورة بعد.</p>`)}
    <section class="win w-cal"><header><span class="db-gi">${App.ico('cal')}</span><h2>التقويم والأجندة</h2><a class="btn sm" href="#desk/cal">تقويمي</a></header><div class="wc">${App.calWin(D)}</div></section>
    ${win('', 'mega', 'إعلانات لم أطّلع عليها', '#desk/ann', 'الإعلانات', unread.length ? h`<ul class="wl">${unread.slice(0, 5).map(a => h`<li><a href="#desk/ann"><b>${a.title}</b> ${a.priority !== 'normal' ? badge(L.prio[a.priority], a.priority === 'urgent' ? 'bad' : 'warn') : ''}</a></li>`)}</ul>` : h`<p class="muted empty">اطّلعت على كل الإعلانات.</p>`)}
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
