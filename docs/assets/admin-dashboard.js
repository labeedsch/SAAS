/* لوحة المتابعة والتنبيهات: بيانات حقيقية من القاعدة، وكل بند يحتاج إجراءً يظهر بزر الإجراء المناسب لدور المستخدم.
   تُحمَّل بعد صفحات اللوحة وقبل admin.js. تستبدل Pages.dashboard وتضيف Pages.alerts. */
(() => {
const { sb, h, raw, $, put, S, L, nf, dt, dtt, staffName, toast, run, must, ask, sure, badge, sb_, table, btn, pageHead, panel, isCoord, role, canReview } = App;
const MS = 864e5;

/* ===== أدوات التاريخ (بالتوقيت المحلي، لا UTC) ===== */
const pad = n => String(n).padStart(2, '0');
const tod = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const midnight = s => new Date(String(s).slice(0, 10) + 'T00:00:00');
const dayDiff = s => Math.round((midnight(s) - midnight(tod())) / MS);          // موجب = مستقبل
const ago = d => {
  const m = Math.floor((Date.now() - new Date(d)) / 6e4);
  if (m < 1) return 'الآن'; if (m < 60) return `قبل ${nf(m)} د`;
  const hr = Math.floor(m / 60); if (hr < 24) return `قبل ${nf(hr)} س`;
  return `قبل ${nf(Math.floor(hr / 24))} يوم`;
};
const dueTxt = s => { const n = dayDiff(s); return n < 0 ? `متأخر ${nf(-n)} يوم` : n === 0 ? 'اليوم' : n === 1 ? 'غداً' : `بعد ${nf(n)} أيام`; };
const short = (t, n = 80) => t && t.length > n ? t.slice(0, n) + '…' : (t || '');
const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;

const IC = {
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>', clip: '<path d="M8 12l6-6a3 3 0 014 4l-8 8a5 5 0 01-7-7l7-7"/>',
  check: '<path d="M5 12l5 5 9-10"/>', task: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4v2h6V4M9 13l2 2 4-4"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>', note: '<path d="M5 4h14v12l-5 5H5z"/><path d="M14 21v-5h5M9 9h6M9 13h3"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 010 6M18 14c2 .6 3 2.2 3 5"/>', layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  mega: '<path d="M4 10v4l12 5V5z"/><path d="M16 9a3 3 0 010 6M7 15l1 5h3l-1-4"/>', flag: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>', doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/>',
  visit: '<path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>', user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', history: '<path d="M4 12a8 8 0 108-8H7M7 4L4 7l3 3"/><path d="M12 8v4l3 2"/>', bars: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  next: '<path d="M15 6l-6 6 6 6"/>', prev: '<path d="M9 6l6 6-6 6"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
};
const ico = n => raw(`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`);

/* ===== تحميل البيانات مرة واحدة (مخزَّن 20 ثانية) ===== */
const cache = { key: null, t: 0, p: null };
App.dropCache = () => { cache.key = null; };
App.data = () => {
  const key = S.cid + '|' + S.me.id;
  if (cache.key === key && Date.now() - cache.t < 20000) return cache.p;
  cache.key = key; cache.t = Date.now();
  cache.p = load().catch(e => { cache.key = null; throw e; });
  return cache.p;
};
async function load() {
  const cid = S.cid, ref = await App.ref(), mgr = isCoord() || role() === 'principal';
  const soft = async p => { const r = await p; if (r.error) { console.warn('dashboard:', r.error.message); return []; } return r.data || []; };
  const vis = await soft(sb.from('technical_visits').select('id,target_party,visit_date,status').eq('cycle_id', cid));
  const [ov, lvs, evals, evid, resp, tasks, meetings, inv, minutes, dls, anns, reads, cards, profs, log] = await Promise.all([
    must(sb.from('cycle_indicator_overview').select('*').eq('cycle_id', cid)),
    must(sb.from('evaluation_levels').select('*').order('sort_order')),
    soft(sb.from('evaluations').select('id,indicator_id,status,achievement_pct,level_id,justification,updated_at,approved_at').eq('cycle_id', cid)),
    soft(sb.from('evidence').select('id,indicator_id,title,status,uploaded_by,review_note,created_at,reviewed_at').eq('cycle_id', cid)),
    soft(sb.from('staff_responsibilities').select('staff_id,kind,indicator_id').eq('cycle_id', cid)),
    soft(sb.from('tasks').select('id,title,status,approval,assignee_staff_id,proposed_by,due_date,start_date,completed_at,completion_note,created_at').eq('cycle_id', cid)),
    soft(sb.from('meetings').select('id,title,meeting_date,start_time,location,status').eq('cycle_id', cid)),
    soft(sb.from('meeting_invitees').select('id,meeting_id,staff_id,rsvp,attended')),
    soft(sb.from('meeting_minutes').select('meeting_id,status')),
    soft(sb.from('deadlines').select('id,kind,domain_id,indicator_id,title,due_date').eq('cycle_id', cid)),
    soft(sb.from('announcements').select('id,title,body,priority,audience,publish_at,expires_at').order('publish_at', { ascending: false }).limit(40)),
    soft(sb.from('announcement_reads').select('announcement_id,profile_id,read_at')),
    vis.length ? soft(sb.from('visit_cards').select('id,visit_id,indicator_id,followup,due_date,responsible_staff_id,required_actions,recommendations').in('visit_id', vis.map(v => v.id))) : Promise.resolve([]),
    soft(sb.from('profiles').select('id,display_name,role,staff_id,is_active')),
    mgr ? soft(sb.from('activity_log').select('id,actor_id,action,entity_type,new_data,old_data,created_at').order('id', { ascending: false }).limit(12)) : Promise.resolve([]),
  ]);
  const mset = new Set(meetings.map(m => m.id));
  return {
    ref, ov, lvs, evals, evid, resp, tasks, meetings, vis, cards, dls, profs, log, reads,
    inv: inv.filter(i => mset.has(i.meeting_id)), minutes: minutes.filter(m => mset.has(m.meeting_id)),
    anns: anns.filter(a => new Date(a.publish_at) <= new Date() && (!a.expires_at || new Date(a.expires_at) > new Date())),
    om: Object.fromEntries(ov.map(o => [o.indicator_id, o])), pname: Object.fromEntries(profs.map(p => [p.id, p.display_name])),
  };
}

/* ===== الإجراءات المطلوبة: مجموعات حسب دور المستخدم ===== */
const SEV = { bad: 3, warn: 2, info: 1 };
function buildAlerts(D) {
  const { ref, ov, evals, evid, resp, tasks, meetings, inv, minutes, dls, anns, reads, cards, vis, om, pname, lvs } = D;
  const sid = S.me.staff_id, T = tod(), co = isCoord(), pr = role() === 'principal', rv = role() === 'reviewer', mgr = co || pr || rv;
  const code = id => ref.im[id]?.code || '—';
  const itext = id => short(ref.im[id]?.official_text, 80);
  const lvl = id => lvs.find(l => l.id === id)?.label_ar;
  const G = [];
  const add = (key, title, icon, desc, items) => { if (items.length) G.push({ key, title, icon, desc, items, tone: items.reduce((m, i) => SEV[i.tone] > SEV[m] ? i.tone : m, 'info') }); };
  const open = (id, label = 'فتح المؤشر', cls = '') => ({ label, href: '#ind/' + id, cls });
  const myInds = kind => new Set(resp.filter(r => r.staff_id === sid && r.kind === kind).map(r => r.indicator_id));
  const mineEval = sid ? myInds('evaluator') : new Set(), mineResp = sid ? myInds('responsible') : new Set();
  const isDone = t => ['completed', 'cancelled'].includes(t.status);

  // ── للمنسق/المدير/المراجع
  if (canReview()) add('evid', 'شواهد تنتظر المراجعة والاعتماد', 'clip', 'شواهد رُفعت ولم يُتخذ فيها قرار بعد.',
    evid.filter(e => ['new', 'under_review'].includes(e.status)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(e => {
      const age = Math.floor((Date.now() - new Date(e.created_at)) / MS);
      return { uid: 'ev:' + e.id, tone: age >= 3 ? 'bad' : 'warn', title: e.title, sub: `المؤشر ${code(e.indicator_id)} · رُفع ${ago(e.created_at)}${pname[e.uploaded_by] ? ' · ' + pname[e.uploaded_by] : ''}`,
        chip: L.evid[e.status], acts: [{ label: 'معاينة', a: 'evView', data: { id: e.id, t: e.title } }, { label: 'مراجعة', a: 'evReview', data: { id: e.id }, cls: 'pri' }] };
    }));
  if (co || pr) add('eval', 'تقييمات بانتظار الاعتماد', 'note', 'تقييمات أرسلها المقيّمون وتنتظر الاعتماد النهائي.',
    evals.filter(e => e.status === 'submitted').sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at)).map(e => ({
      uid: 'evl:' + e.id, tone: Math.floor((Date.now() - new Date(e.updated_at)) / MS) >= 3 ? 'bad' : 'warn', title: `${code(e.indicator_id)} — ${itext(e.indicator_id)}`,
      sub: `${e.achievement_pct != null ? nf(Math.round(e.achievement_pct)) + '%' : 'بلا نسبة'}${lvl(e.level_id) ? ' · ' + lvl(e.level_id) : ''} · أُرسل ${ago(e.updated_at)}`,
      acts: [open(e.indicator_id), ...(e.level_id ? [{ label: 'اعتماد', a: 'dbEvalApprove', data: { id: e.id }, cls: 'pri' }] : [])] })));
  if (co) {
    add('tprop', 'مقترحات مهام تنتظر قرارك', 'task', 'اقتراحات الأعضاء لا تصبح تكليفاً إلا باعتمادك.',
      tasks.filter(t => t.approval === 'proposed').map(t => ({ uid: 'tk:' + t.id, tone: 'warn', title: t.title, sub: `اقتراح ${pname[t.proposed_by] ? 'من ' + pname[t.proposed_by] : 'عضو'} · ${ago(t.created_at)}`,
        acts: [{ label: 'اعتماد', a: 'dbTkApprove', data: { i: t.id }, cls: 'pri' }, { label: 'رفض', a: 'dbTkReject', data: { i: t.id }, cls: 'bad' }] })));
    add('trev', 'مهام بانتظار اعتماد الإغلاق', 'check', 'أنجزها المكلّفون وأرسلوها للمراجعة.',
      tasks.filter(t => t.approval === 'approved' && t.status === 'awaiting_review').map(t => ({ uid: 'tk:' + t.id, tone: 'warn', title: t.title,
        sub: `المكلّف ${staffName(t.assignee_staff_id)}${t.completion_note ? ' · ' + short(t.completion_note, 70) : ''}`,
        acts: [{ label: 'اعتماد الإغلاق', a: 'dbTkClose', data: { i: t.id }, cls: 'pri' }, { label: 'إعادة للتنفيذ', a: 'dbTkReopen', data: { i: t.id } }] })));
    const mt = Object.fromEntries(meetings.map(m => [m.id, m]));
    add('min', 'محاضر تنتظر الاعتماد', 'doc', 'محاضر اجتماعات لم تُعتمد، واجتماعات عُقدت بلا محضر.', [
      ...minutes.filter(m => m.status === 'draft').map(m => ({ uid: 'mn:' + m.meeting_id, tone: 'warn', title: mt[m.meeting_id].title, sub: `محضر مسودة · اجتماع ${dt(mt[m.meeting_id].meeting_date)}`,
        acts: [{ label: 'فتح المحضر', href: '#meeting/' + m.meeting_id }, { label: 'اعتماد', a: 'dbMnApprove', data: { m: m.meeting_id }, cls: 'pri' }] })),
      ...meetings.filter(m => m.status === 'held' && !minutes.some(x => x.meeting_id === m.id)).map(m => ({ uid: 'mn:' + m.id, tone: 'warn', title: m.title, sub: `عُقد ${dt(m.meeting_date)} ولم يُكتب محضر`, acts: [{ label: 'كتابة المحضر', href: '#meeting/' + m.id, cls: 'pri' }] })),
    ]);
    const hasEv = new Set(resp.filter(r => r.kind === 'evaluator').map(r => r.indicator_id)), hasRs = new Set(resp.filter(r => r.kind === 'responsible').map(r => r.indicator_id));
    const agg = (key, label, miss, sub) => miss.length ? [{ uid: key, tone: 'info', title: `${nf(miss.length)} مؤشراً ${label}`, sub: miss.slice(0, 8).map(i => i.code).join('، ') + (miss.length > 8 ? '…' : ''), acts: [{ label: 'إدارة المسؤوليات', href: '#assign', cls: 'pri' }] }] : [];
    add('noassign', 'مؤشرات تحتاج إسناداً', 'users', 'لا يمكن متابعة مؤشر لا مقيّم له أو لا مسؤول عنه.', [...agg('noev', 'بلا مقيّم', ref.inds.filter(i => !hasEv.has(i.id))), ...agg('nors', 'بلا مسؤول', ref.inds.filter(i => !hasRs.has(i.id)))]);
  }
  // ── مواعيد الإغلاق (للجميع، مقصورة على ما يخص غير المدراء)
  const domInds = Object.fromEntries(ref.domains.map(d => [d.id, ref.inds.filter(i => i.dom?.id === d.id).map(i => i.id)]));
  const relevant = d => mgr || (d.kind === 'indicator_close' ? mineEval.has(d.indicator_id) || mineResp.has(d.indicator_id) : (domInds[d.domain_id] || []).some(i => mineEval.has(i) || mineResp.has(i)));
  const unfinished = d => d.kind === 'indicator_close' ? om[d.indicator_id]?.eval_status !== 'approved' : (domInds[d.domain_id] || []).some(i => om[i]?.eval_status !== 'approved');
  add('dl', 'مواعيد إغلاق قريبة أو متجاوزة', 'cal', 'مواعيد لم يكتمل ما يتعلق بها (خلال 7 أيام أو انقضت).',
    dls.filter(d => dayDiff(d.due_date) <= 7 && unfinished(d) && relevant(d)).sort((a, b) => a.due_date.localeCompare(b.due_date)).map(d => { const n = dayDiff(d.due_date);
      return { uid: 'dl:' + d.id, tone: n < 0 ? 'bad' : n <= 3 ? 'warn' : 'info', title: d.title, sub: `${dt(d.due_date)} · ${dueTxt(d.due_date)}`, acts: [d.indicator_id ? open(d.indicator_id) : { label: 'التقويم والمواعيد', href: '#cal' }] }; }));
  // ── المهام المتأخرة (للمدراء: الكل)
  const late = t => t.approval === 'approved' && !isDone(t) && t.due_date && dayDiff(t.due_date) < 0;
  const allLate = co || pr || rv;
  if (allLate) add('tlate', 'مهام متأخرة', 'alert', 'مهام معتمدة تجاوزت موعدها ولم تُغلق.',
    tasks.filter(late).sort((a, b) => a.due_date.localeCompare(b.due_date)).map(t => ({ uid: 'tk:' + t.id, tone: 'bad', title: t.title, sub: `المكلّف ${staffName(t.assignee_staff_id)} · ${dueTxt(t.due_date)}`, acts: [{ label: 'فتح المهام', href: '#tasks' }] })));
  // ── متابعات الزيارات الفنية
  const vm = Object.fromEntries(vis.map(v => [v.id, v]));
  add('visit', 'متابعات زيارات فنية مفتوحة', 'visit', 'إجراءات أوصت بها الزيارات ولم تُغلق.',
    cards.filter(c => c.followup !== 'closed' && (mgr || c.responsible_staff_id === sid)).map(c => { const n = c.due_date ? dayDiff(c.due_date) : null;
      return { uid: 'vc:' + c.id, tone: n != null && n < 0 ? 'bad' : n != null && n <= 7 ? 'warn' : 'info', title: `${code(c.indicator_id)} — ${short(c.required_actions || c.recommendations || 'متابعة زيارة فنية', 70)}`,
        sub: `${vm[c.visit_id]?.target_party || ''}${c.due_date ? ' · ' + dt(c.due_date) + ' (' + dueTxt(c.due_date) + ')' : ''}`, acts: [{ label: 'فتح الزيارة', href: '#visit/' + c.visit_id }] }; }));

  // ── ما يخص المستخدم نفسه
  if (sid) {
    add('myeval', 'مؤشرات تنتظر تقييمك', 'note', 'مؤشرات أنت مقيّمها ولم تُرسَل للاعتماد بعد.',
      [...mineEval].filter(i => ref.im[i] && ['not_evaluated', 'draft'].includes(om[i]?.eval_status || 'not_evaluated')).sort((a, b) => App.codeCmp(code(a), code(b))).map(i => ({
        uid: 'me:' + i, tone: om[i]?.eval_status === 'draft' ? 'warn' : 'info', title: `${code(i)} — ${itext(i)}`, sub: om[i]?.eval_status === 'draft' ? 'مسودة لم تُرسل للمراجعة' : 'لم يُقيَّم بعد', acts: [open(i, 'فتح وتقييم', 'pri')] })));
    add('myfix', 'شواهد تحتاج استكمالاً أو رُفضت', 'clip', 'ملاحظات المراجعة على شواهدك.',
      evid.filter(e => e.uploaded_by === S.me.id && ['needs_completion', 'rejected'].includes(e.status)).map(e => ({ uid: 'ev:' + e.id, tone: 'bad', title: e.title,
        sub: `${L.evid[e.status]} · المؤشر ${code(e.indicator_id)}${e.review_note ? ' · ' + short(e.review_note, 80) : ''}`, acts: [{ label: 'معاينة', a: 'evView', data: { id: e.id, t: e.title } }, open(e.indicator_id, 'فتح المؤشر', 'pri')] })));
    add('myresp', 'مؤشرات أنت مسؤولها بلا شاهد معتمد', 'layers', 'وفّر الشواهد المطلوبة وارفعها من صفحة المؤشر.',
      [...mineResp].filter(i => ref.im[i] && !(Number(om[i]?.approved_evidence) > 0)).sort((a, b) => App.codeCmp(code(a), code(b))).map(i => ({
        uid: 'mr:' + i, tone: 'info', title: `${code(i)} — ${itext(i)}`, sub: Number(om[i]?.total_evidence) > 0 ? `${nf(om[i].total_evidence)} شاهد قيد المراجعة` : 'لم يُرفع شاهد', acts: [open(i, 'فتح المؤشر', 'pri')] })));
    add('mytask', 'مهامي', 'task', 'مهام معتمدة أُسندت إليك.',
      tasks.filter(t => t.approval === 'approved' && t.assignee_staff_id === sid && ['new', 'in_progress', 'overdue'].includes(t.status) && !(allLate && late(t))).sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9')).map(t => {
        const n = t.due_date ? dayDiff(t.due_date) : null;
        return { uid: 'tk:' + t.id, tone: n != null && n < 0 ? 'bad' : n != null && n <= 3 ? 'warn' : 'info', title: t.title, sub: `${L.task[t.status]}${t.due_date ? ' · ' + dt(t.due_date) + ' (' + dueTxt(t.due_date) + ')' : ''}`,
          acts: [...(t.status === 'new' || t.status === 'overdue' ? [{ label: 'بدء', a: 'dbTkStart', data: { i: t.id } }] : []), { label: 'إرسال للمراجعة', a: 'dbTkSubmit', data: { i: t.id }, cls: 'pri' }] }; }));
    const mm = Object.fromEntries(meetings.map(m => [m.id, m]));
    add('rsvp', 'اجتماعات تنتظر ردّك', 'cal', 'أكّد حضورك أو اعتذر.',
      inv.filter(i => i.staff_id === sid && i.rsvp === 'pending' && mm[i.meeting_id]?.status === 'scheduled' && dayDiff(mm[i.meeting_id].meeting_date) >= 0).map(i => { const m = mm[i.meeting_id], n = dayDiff(m.meeting_date);
        return { uid: 'rv:' + i.id, tone: n <= 2 ? 'warn' : 'info', title: m.title, sub: `${dt(m.meeting_date)}${m.start_time ? ' · ' + m.start_time.slice(0, 5) : ''}${m.location ? ' · ' + m.location : ''}`,
          acts: [{ label: 'سأحضر', a: 'dbRsvp', data: { i: i.id, v: 'confirmed' }, cls: 'pri' }, { label: 'أعتذر', a: 'dbRsvp', data: { i: i.id, v: 'declined' } }] }; }));
  }
  // ── إعلانات لم تُقرأ (لغير المنسق)
  if (!co) add('ann', 'إعلانات لم تطّلع عليها', 'mega', 'إعلانات موجّهة إليك.',
    anns.filter(a => !reads.some(r => r.announcement_id === a.id && r.profile_id === S.me.id)).map(a => ({ uid: 'an:' + a.id, tone: a.priority === 'urgent' ? 'bad' : a.priority === 'important' ? 'warn' : 'info', title: a.title,
      sub: short(a.body, 90), chip: a.priority !== 'normal' ? L.prio[a.priority] : '', acts: [{ label: 'تعليم كمقروء', a: 'dbAnnRead', data: { i: a.id }, cls: 'pri' }, { label: 'الإعلانات', href: '#ann' }] })));

  G.sort((a, b) => SEV[b.tone] - SEV[a.tone]);
  const uids = new Set(); G.forEach(g => g.items.forEach(i => uids.add(i.uid)));
  const bySev = { bad: 0, warn: 0, info: 0 }; const seen = new Set();
  G.forEach(g => g.items.forEach(i => { if (!seen.has(i.uid)) { seen.add(i.uid); bySev[i.tone]++; } }));
  return { groups: G, total: uids.size, bySev };
}
App.alerts = async () => { const D = await App.data(); const A = buildAlerts(D); App.alertCount = A.total; App.lastAlerts = A; return A; };

/* ===== عرض المجموعات ===== */
const actHtml = a => a.href ? h`<a class="btn sm ${a.cls || ''}" href="${a.href}">${a.label}</a>` : btn(a.label, a.a, a.data || {}, a.cls || '');
const itemHtml = i => h`<li class="db-it ${i.tone}"><div class="db-itx"><b>${i.title}${i.chip ? h` <span class="bdg warn">${i.chip}</span>` : ''}</b><small>${i.sub}</small></div><div class="chips">${i.acts.map(actHtml)}</div></li>`;
const groupCard = (g, max) => h`<section class="db-g ${g.tone}"><header><span class="db-gi">${ico(g.icon)}</span><div><h3>${g.title}</h3><small>${g.desc}</small></div><span class="db-gc">${nf(g.items.length)}</span></header>
  <ul>${g.items.slice(0, max).map(itemHtml)}</ul>${g.items.length > max ? h`<a class="db-more" href="#alerts">وعرض ${nf(g.items.length - max)} أخرى في صفحة التنبيهات</a>` : ''}</section>`;

App.groupCard = groupCard; App.itemHtml = itemHtml;

/* ===== الإجراءات السريعة ===== */
const done = async (p, msg) => { if (await run(p, msg)) App.refresh(); };
Act.dbEvalApprove = async ({ id }) => { if (await sure('اعتماد هذا التقييم؟ يظهر معتمداً في النتائج.')) await done(sb.from('evaluations').update({ status: 'approved', approved_by: S.me.id }).eq('id', id), 'اعتُمد التقييم'); };
Act.dbTkApprove = async ({ i }) => {
  const t = (await must(sb.from('tasks').select('*').eq('id', i).maybeSingle())); if (!t) return;
  const v = await ask('اعتماد المهمة', [{ k: 'assignee_staff_id', l: 'المكلّف', t: 'select', req: 1, o: App.staffOpts() }, { k: 'start_date', l: 'البداية', t: 'date' }, { k: 'due_date', l: 'النهاية', t: 'date' }, { k: 'required_output', l: 'المخرج المطلوب' }, { k: 'task_type', l: 'النوع', t: 'select', req: 1, o: Object.entries(L.ttype) }], t); if (!v) return;
  if (await run(sb.from('tasks').update({ ...v, approval: 'approved' }).eq('id', i), 'اعتُمدت المهمة')) {
    if (App.queueWa) App.waReport([await App.queueWa('task_new', v.assignee_staff_id, { عنوان: t.title, موعد: v.due_date ? dt(v.due_date) : '—', مخرج: v.required_output || '—' }, null)]);
    App.refresh();
  }
};
Act.dbTkReject = async ({ i }) => { if (await sure('رفض هذا الاقتراح؟')) await done(sb.from('tasks').update({ approval: 'rejected', status: 'cancelled' }).eq('id', i), 'رُفض الاقتراح'); };
Act.dbTkClose = async ({ i }) => { if (await sure('اعتماد إغلاق المهمة؟')) await done(sb.from('tasks').update({ status: 'completed' }).eq('id', i), 'أُغلقت المهمة'); };
Act.dbTkReopen = async ({ i }) => done(sb.from('tasks').update({ status: 'in_progress' }).eq('id', i), 'أُعيدت للتنفيذ');
Act.dbTkStart = async ({ i }) => done(sb.from('tasks').update({ status: 'in_progress' }).eq('id', i), 'بدأ التنفيذ');
Act.dbTkSubmit = async ({ i }) => { const v = await ask('إرسال للمراجعة', [{ k: 'completion_note', l: 'ملاحظة الإنجاز والمخرج', t: 'textarea' }]); if (v) await done(sb.from('tasks').update({ status: 'awaiting_review', ...(v.completion_note ? { completion_note: v.completion_note } : {}) }).eq('id', i), 'أُرسلت للمراجعة'); };
Act.dbMnApprove = async ({ m }) => { if (await sure('اعتماد المحضر؟')) await done(sb.from('meeting_minutes').update({ status: 'approved' }).eq('meeting_id', m), 'اعتُمد المحضر'); };
Act.dbRsvp = async ({ i, v }) => { let reason = null; if (v === 'declined') { const r = await ask('سبب الاعتذار', [{ k: 'reason', l: 'السبب (اختياري)' }]); if (!r) return; reason = r.reason; } await done(sb.from('meeting_invitees').update({ rsvp: v, rsvp_reason: reason }).eq('id', i), 'سُجّل ردّك'); };
Act.dbAnnRead = async ({ i }) => done(sb.from('announcement_reads').upsert({ announcement_id: i, profile_id: S.me.id }, { onConflict: 'announcement_id,profile_id', ignoreDuplicates: true }), 'عُلّم كمقروء');
Act.dbAnnWho = async ({ i }) => {
  const D = await App.data(), r = D.reads.filter(x => x.announcement_id === i);
  App.modal('من اطّلع على الإعلان', r.length ? h`<ul>${r.map(x => h`<li>${D.pname[x.profile_id] || 'عضو'} — ${dtt(x.read_at)}</li>`)}</ul><p class="muted">${nf(r.length)} اطّلعوا</p>` : h`<p class="muted">لم يطّلع أحد بعد.</p>`);
};

/* ===== مكوّنات العرض ===== */
const ENT = { evaluations: 'تقييم مؤشر', evidence: 'شاهد', evidence_files: 'ملف شاهد', indicator_assignments: 'إسناد مؤشر', domain_assignments: 'إسناد مجال', cycles: 'دورة', staff: 'منسوب', profiles: 'حساب' };
const VERB = { insert: 'أُضيف', update: 'عُدّل', delete: 'حُذف' };
const logLine = (l, D) => {
  const d = l.new_data || l.old_data || {}, c = d.indicator_id ? D.ref.im[d.indicator_id]?.code : '', who = D.pname[l.actor_id] || 'النظام';
  let what = `${VERB[l.action] || l.action} ${ENT[l.entity_type] || l.entity_type}${c ? ' ' + c : ''}`;
  if (l.entity_type === 'evaluations' && l.new_data?.status === 'approved' && l.old_data?.status !== 'approved') what = `اعتُمد تقييم المؤشر ${c}`;
  else if (l.entity_type === 'evaluations' && l.new_data?.status === 'submitted' && l.old_data?.status !== 'submitted') what = `أُرسل للاعتماد تقييم المؤشر ${c}`;
  else if (l.entity_type === 'evidence' && l.new_data?.status && l.old_data?.status !== l.new_data.status) what = `${L.evid[l.new_data.status]}: شاهد${c ? ' للمؤشر ' + c : ''}`;
  return { who, what, t: l.created_at };
};

/* ===== اللوحة الشاملة: نظرة كاملة على المنصة، ولكل قسم نافذته ===== */
const ring = (p, label, sub, tone) => {
  const v = Math.max(0, Math.min(100, p || 0)), C = 2 * Math.PI * 34;
  return h`<div class="db-ring ${tone}"><div class="db-rg"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="t" cx="40" cy="40" r="34"/><circle class="v" cx="40" cy="40" r="34" stroke-dasharray="${(v / 100 * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg><b>${nf(Math.round(v))}%</b></div><strong>${label}</strong><small>${sub}</small></div>`;
};
/* بطاقة مؤشر بنمط بطاقات الخطط الذكية: أيقونة، رقم كبير، شريط مع نسبة، وصف */
const kc = (tone, icon, label, value, p, cap, href, solid) => h`<${raw(href ? 'a' : 'div')} ${raw(href ? `href="${href}"` : '')} class="kc ${tone} ${solid ? 'solid' : ''}"><header><span class="kc-i">${ico(icon)}</span><span class="kc-l">${label}</span></header><b class="kc-v">${value}</b><div class="kc-b"><span class="kc-pc">${nf(Math.round(p || 0))}%</span><i><u style="width:${Math.max(0, Math.min(100, p || 0))}%"></u></i></div><small>${cap}</small></${raw(href ? 'a' : 'div')}>`;
/* شريط إشعارات صغير أسفل النافذة: أيقونة وعدد وعنوان */
const nstrip = xs => h`<div class="ns" role="group" aria-label="ملخص سريع">${xs.map(x => { const inner = h`${ico(x.ico)}<b>${nf(x.v)}</b><span>${x.label}</span>`; return x.href ? h`<a class="np ${x.v ? x.tone : ''}" href="${x.href}">${inner}</a>` : h`<span class="np ${x.v ? x.tone : ''}">${inner}</span>`; })}</div>`;

/* التقويم الشهري مع نقاط الأحداث، وبجواره الأجندة */
const CAL = { y: null, m: null, sel: null }, WD = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const DOT = { 'اجتماع': 'info', 'زيارة فنية': 'ok', 'متابعة زيارة': 'ok', 'مهمة': 'warn', 'إغلاق': 'bad' };
let calD = null;
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
function calHtml() {
  const now = new Date(); if (CAL.y == null) { CAL.y = now.getFullYear(); CAL.m = now.getMonth(); }
  const items = App.agendaItems ? App.agendaItems(calD) : [], by = {};
  items.forEach(x => (by[x.d] ||= []).push(x));
  const first = new Date(CAL.y, CAL.m, 1), start = first.getDay(), days = new Date(CAL.y, CAL.m + 1, 0).getDate(), T = tod();
  const title = first.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' });
  const cells = [];
  for (let i = 0; i < start; i++) cells.push(h`<span class="cc off"></span>`);
  for (let d = 1; d <= days; d++) {
    const k = ymd(CAL.y, CAL.m, d), ev = by[k] || [], kinds = [...new Set(ev.map(e => e.tone === 'bad' && dayDiff(k) < 0 ? 'bad' : DOT[e.kind] || 'info'))].slice(0, 3);
    cells.push(h`<button type="button" class="cc ${k === T ? 'today' : ''} ${k === CAL.sel ? 'sel' : ''} ${ev.length ? 'has' : ''}" data-a="calSel" data-d="${k}" aria-label="${d} ${title}${ev.length ? '، ' + ev.length + ' حدث' : ''}" ${k === CAL.sel ? raw('aria-pressed="true"') : ''}><span>${nf(d)}</span><i>${kinds.map(t => h`<u class="${t}"></u>`)}</i></button>`);
  }
  return h`<div class="cal-h"><button type="button" class="btn sm" data-a="calNav" data-v="1" aria-label="الشهر التالي">${ico('next')}</button><b>${title}</b><button type="button" class="btn sm" data-a="calNav" data-v="-1" aria-label="الشهر السابق">${ico('prev')}</button></div>
  <div class="cal-g" role="grid">${WD.map(w => h`<span class="cw">${w}</span>`)}${cells}</div>
  <div class="cal-l"><span class="info">اجتماع</span><span class="ok">زيارة</span><span class="warn">مهمة</span><span class="bad">إغلاق / متأخر</span><button type="button" class="btn sm" data-a="calToday">اليوم</button></div>`;
}
function agHtml() {
  const items = App.agendaItems ? App.agendaItems(calD) : [];
  if (CAL.sel) { const xs = items.filter(x => x.d === CAL.sel); return h`<div class="ag-h"><h3>${new Date(CAL.sel + 'T00:00:00').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })}</h3><button type="button" class="btn sm" data-a="calSel" data-d="${CAL.sel}">عرض الأسبوع القادم</button></div>${xs.length ? App.agendaFlat(xs) : h`<p class="muted empty">لا أحداث في هذا اليوم.</p>`}`; }
  const hh = App.agendaHtml(calD, 7, 8);
  return h`<div class="ag-h"><h3>الأسبوع القادم</h3><a class="btn sm" href="#team/overview">أجندة الفريق</a></div>${hh || h`<p class="muted empty">لا اجتماعات ولا زيارات ولا مواعيد ولا مهام خلال الأسبوع القادم.</p>`}`;
}
const calRedraw = () => { put($('#wcal'), calHtml()); put($('#wag'), agHtml()); };
Act.calNav = ({ v }) => { let m = CAL.m + Number(v), y = CAL.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } CAL.m = m; CAL.y = y; put($('#wcal'), calHtml()); };
Act.calSel = ({ d }) => { CAL.sel = CAL.sel === d ? null : d; if (CAL.sel) { const x = new Date(d + 'T00:00:00'); CAL.y = x.getFullYear(); CAL.m = x.getMonth(); } calRedraw(); };
Act.calToday = () => { const n = new Date(); CAL.y = n.getFullYear(); CAL.m = n.getMonth(); CAL.sel = null; calRedraw(); };

/* بطاقات المجالات الأربعة: تُعرض في صفحة إدارة المؤشرات */
App.domCards = async () => {
  const D = await App.data(), { ref, om } = D, stOf = i => om[i.id]?.eval_status || 'not_evaluated';
  return h`<div class="kcs d4">${ref.domains.map((d, i) => { const dx = ref.inds.filter(x => x.dom?.id === d.id), n = dx.length, ok = dx.filter(x => stOf(x) === 'approved').length, sb2 = dx.filter(x => stOf(x) === 'submitted').length, nv = dx.filter(x => stOf(x) === 'not_evaluated').length;
    return kc('d' + (i % 4), 'flag', d.name_ar, h`${nf(ok)}<span class="of"> / ${nf(n)}</span>`, n ? ok / n * 100 : 0, n && ok === n ? 'منجز بالكامل' : [sb2 ? nf(sb2) + ' بانتظار الاعتماد' : '', nv ? nf(nv) + ' لم يبدأ' : ''].filter(Boolean).join(' · ') || 'متبقٍ ' + nf(n - ok) + ' مؤشراً', '#inds/map/' + d.id); })}</div>`;
};

const win = (cls, icon, title, href, linkLabel, body) => h`<section class="win ${cls}"><header><span class="db-gi">${ico(icon)}</span><h2>${title}</h2><a class="btn sm" href="${href}">${linkLabel}</a></header>${body}</section>`;
const ms = (label, v, tone = '', href = '') => href ? h`<a class="ms ${tone}" href="${href}"><b>${nf(v)}</b><small>${label}</small></a>` : h`<div class="ms ${tone}"><b>${nf(v)}</b><small>${label}</small></div>`;
const mini = (xs, empty) => xs.length ? h`<ul class="wl">${xs}</ul>` : h`<p class="muted empty">${empty}</p>`;
Pages.dashboard = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  const [D, A] = await Promise.all([App.data(), App.alerts()]); App.drawMenu?.();
  const { ref, om, resp, evid, tasks, meetings, vis, cards, profs, log } = D, c = App.cycle(), co = isCoord(), T = tod();
  const readSet = new Set(D.reads.filter(r => r.profile_id === S.me.id).map(r => r.announcement_id));
  const stOf = i => om[i.id]?.eval_status || 'not_evaluated';
  const cnt = st => ref.inds.filter(i => stOf(i) === st).length;
  const nInd = ref.inds.length, nOk = cnt('approved'), nSub = cnt('submitted'), nDr = cnt('draft'), nNo = cnt('not_evaluated');
  const doms = ref.domains.map(d => { const xs = ref.inds.filter(i => i.dom?.id === d.id), ok = xs.filter(i => stOf(i) === 'approved').length; return { d, n: xs.length, ok, done: xs.length > 0 && ok === xs.length }; });
  const stds = ref.standards.map(s => { const xs = ref.inds.filter(i => i.std?.id === s.id); return xs.length > 0 && xs.every(i => stOf(i) === 'approved'); });
  const domDone = doms.filter(x => x.done).length, stdDone = stds.filter(Boolean).length;
  const pct = nInd ? Math.round(nOk / nInd * 100) : 0;
  const left = c.end_date ? dayDiff(c.end_date) : null;
  // الشواهد
  const evOk = evid.filter(e => e.status === 'approved').length, evPend = evid.filter(e => ['new', 'under_review'].includes(e.status)).length, evFix = evid.filter(e => e.status === 'needs_completion').length;
  // المهام (المعتمدة فقط)
  const tk = tasks.filter(t => t.approval === 'approved'), tkDone = tk.filter(t => t.status === 'completed').length;
  const tkLate = tk.filter(t => !['completed', 'cancelled'].includes(t.status) && (t.status === 'overdue' || (t.due_date && String(t.due_date).slice(0, 10) < T))).length;
  const tkRun = tk.filter(t => ['new', 'in_progress'].includes(t.status)).length - tk.filter(t => ['new', 'in_progress'].includes(t.status) && (t.due_date && String(t.due_date).slice(0, 10) < T)).length;
  const tkRev = tasks.filter(t => t.status === 'awaiting_review').length, tkProp = tasks.filter(t => t.approval === 'proposed').length;
  const nextM = meetings.filter(m => m.status === 'scheduled' && dayDiff(m.meeting_date) >= 0).sort((a, b) => String(a.meeting_date).localeCompare(b.meeting_date))[0];
  const nextV = vis.filter(v => !['done', 'completed', 'cancelled'].includes(v.status) && v.visit_date && dayDiff(v.visit_date) >= 0).sort((a, b) => String(a.visit_date).localeCompare(b.visit_date))[0];
  const openCards = cards.filter(k => k.followup !== 'closed').length;
  // المنصة
  const hasEv = new Set(resp.filter(r => r.kind === 'evaluator').map(r => r.indicator_id)), hasRs = new Set(resp.filter(r => r.kind === 'responsible').map(r => r.indicator_id));
  const noEv = ref.inds.filter(i => !hasEv.has(i.id)).length, noRs = ref.inds.filter(i => !hasRs.has(i.id)).length;
  const staffAct = S.staff.filter(s => s.is_active).length, accounts = profs.filter(p => p.is_active && p.role !== 'external_evaluator').length;
  const accSet = new Set(profs.filter(p => p.is_active && p.staff_id).map(p => p.staff_id));
  const evNoAcc = new Set(resp.filter(r => r.kind === 'evaluator' && !accSet.has(r.staff_id)).map(r => r.staff_id)).size;
  // الإجراءات: أهم العناصر عبر المجموعات
  const items = A.groups.flatMap(g => g.items.map(i => ({ ...i, _g: g.title }))).sort((a, b) => SEV[b.tone] - SEV[a.tone]);
  calD = D;
  const stf = id => S.staff.find(x => x.id === id);
  const evOf = id => resp.filter(r => r.kind === 'evaluator' && r.indicator_id === id).map(r => staffName(r.staff_id));
  const moves = [
    ...ref.inds.filter(i => !hasEv.has(i.id)).map(i => ({ tone: 'bad', title: i.code + ' — ' + short(i.official_text, 60), sub: 'لا مقيّم لهذا المؤشر، فلن يبدأ تقييمه.', acts: co ? [{ label: 'إسناد مقيّم', href: '#platform/assign', cls: 'pri' }, { label: 'فتح المؤشر', href: '#ind/' + i.id }] : [{ label: 'فتح المؤشر', href: '#ind/' + i.id }] })),
    ...ref.inds.filter(i => hasEv.has(i.id) && stOf(i) === 'not_evaluated').map(i => ({ tone: 'warn', title: i.code + ' — ' + short(i.official_text, 60), sub: 'لم يبدأ تقييمه · المقيّم: ' + evOf(i.id).join('، '), acts: [{ label: 'فتح المؤشر', href: '#ind/' + i.id }] })),
  ];
  const setup = (co || role() === 'principal') ? [
    ...[...new Set(resp.filter(r => r.kind === 'evaluator' && !accSet.has(r.staff_id) && stf(r.staff_id)?.is_active).map(r => r.staff_id))].slice(0, 3).map(id => ({ tone: 'warn', title: 'مقيّم بلا حساب: ' + staffName(id), sub: 'لا يستطيع تسجيل تقييمه قبل إنشاء حساب له.', acts: co ? [{ label: 'إنشاء حساب', href: '#platform/staff', cls: 'pri' }] : [] })),
    ...(noRs ? [{ tone: 'warn', title: nf(noRs) + ' مؤشراً بلا مسؤول', sub: 'المسؤول يوفّر الشواهد والوثائق للمؤشر.', acts: co ? [{ label: 'إسناد المسؤوليات', href: '#platform/assign', cls: 'pri' }] : [] }] : []),
  ] : [];
  const strip = D.anns.slice().sort((a, b) => (b.priority !== 'normal') - (a.priority !== 'normal'));

  return h`
  ${strip.length ? h`<div class="db-strip" role="region" aria-label="الإعلانات">${ico('mega')}<div>${strip.slice(0, 5).map(a => h`<a href="#ann" class="${a.priority}">${a.priority !== 'normal' ? h`<b>${L.prio[a.priority]}:</b> ` : ''}${a.title}${!co && !readSet.has(a.id) ? h` <i class="db-dot" title="لم تطّلع عليه"></i>` : ''}</a>`)}</div><a class="btn sm" href="#ann">كل الإعلانات</a></div>` : ''}

  <section class="db-hero cmp"><div class="db-ht"><small>لوحة التحكم · ${c.name}</small><h1>متابعة التقويم الذاتي</h1>
      <p class="muted">${left == null ? 'لم يُحدَّد تاريخ نهاية الدورة.' : left >= 0 ? 'متبقٍ ' + nf(left) + ' يوماً على نهاية الدورة · ' + dt(c.end_date) : 'تجاوزت الدورة نهايتها بـ ' + nf(-left) + ' يوماً'}</p>
      <div class="chips"><a class="db-chip ${A.total ? 'warn' : 'ok'}" href="#dashboard/alerts">${ico('bell')} ${A.total ? nf(A.total) + ' تحتاج إجراء' : 'لا إجراءات معلّقة'}</a><span class="db-chip">${ico('layers')} ${nf(stdDone)} معيار منجز من ${nf(stds.length)}</span><span class="db-chip">${ico('task')} ${nf(tkDone)} مهمة منجزة من ${nf(tk.length)}</span></div></div>
    <div class="db-rings">${ring(pct, 'إنجاز المؤشرات', nf(nOk) + ' من ' + nf(nInd) + ' معتمد', 'info')}${ring(doms.length ? domDone / doms.length * 100 : 0, 'المجالات المنجزة', nf(domDone) + ' من ' + nf(doms.length) + ' · متبقٍ ' + nf(doms.length - domDone), 'ok')}${ring(evid.length ? evOk / evid.length * 100 : 0, 'الشواهد المعتمدة', nf(evOk) + ' من ' + nf(evid.length), '')}</div></section>

  <div class="kcs">${kc('teal', 'layers', 'كل المؤشرات', nf(nInd), pct, 'المعتمد منها ' + nf(nOk) + ' · افتح خريطة التقدم', '#inds/map', true)}${kc('ok', 'check', 'معتمد', nf(nOk), nInd ? nOk / nInd * 100 : 0, 'عرض المؤشرات المعتمدة', '#inds/list/approved')}${kc('info', 'clock', 'بانتظار الاعتماد', nf(nSub), nInd ? nSub / nInd * 100 : 0, nSub ? (co ? 'راجع واعتمد الآن' : 'أُرسلت للمراجعة') : 'لا شيء ينتظر', '#inds/list/submitted')}${kc('mute', 'note', 'مسودة', nf(nDr), nInd ? nDr / nInd * 100 : 0, nDr ? 'تقييمات تحتاج إكمالاً' : 'لا مسودات', '#inds/list/draft')}${kc('warn', 'alert', 'لم يُقيَّم', nf(nNo), nInd ? nNo / nInd * 100 : 0, nNo ? 'ابدأ التقييم' : 'اكتمل التقييم', '#inds/list/not_evaluated')}${kc('bad', 'users', 'بلا مقيّم', nf(noEv), nInd ? noEv / nInd * 100 : 0, noEv ? (co ? 'أسنِد مقيّماً الآن' : 'يحتاج إسناداً') : 'كل المؤشرات مسندة', '#platform/assign')}</div>

  <div class="wins">
  ${win('w-act ' + (A.bySev.bad ? 'bad' : A.total ? 'warn' : 'ok'), 'bell', 'إجراءات تحتاج قرارك', '#dashboard/alerts', 'كل التنبيهات (' + nf(A.total) + ')',
    h`${mini(items.slice(0, 4).map(itemHtml), 'لا توجد إجراءات معلّقة. كل شيء منجز.')}${items.length > 4 ? h`<a class="db-more" href="#dashboard/alerts">وعرض ${nf(items.length - 4)} آخر</a>` : ''}
    ${nstrip([{ ico: 'alert', label: 'عاجل', v: A.bySev.bad, tone: 'bad', href: '#dashboard/alerts' }, { ico: 'clock', label: 'يحتاج متابعة', v: A.bySev.warn, tone: 'warn', href: '#dashboard/alerts' }, { ico: 'bell', label: 'للعلم', v: A.bySev.info, tone: 'info', href: '#dashboard/alerts' }])}`)}

  ${win('w-ind', 'note', 'إدارة المؤشرات', '#inds/list', 'فتح المؤشرات',
    h`${moves.length ? h`<h3 class="wh">مؤشرات تحتاج تحرّكاً</h3>` : ''}${mini(moves.slice(0, 4).map(itemHtml), 'كل المؤشرات مسندة وبدأ تقييمها.')}${moves.length > 4 ? h`<a class="db-more" href="#inds/list/not_evaluated">وعرض ${nf(moves.length - 4)} آخر</a>` : ''}
    <div class="wb"><a class="btn sm" href="#inds/evidence">مراجعة الشواهد</a><a class="btn sm" href="#inds/map">خريطة التقدم</a></div>
    ${nstrip([{ ico: 'clip', label: 'شواهد بانتظار المراجعة', v: evPend, tone: 'info', href: '#inds/evidence/new' }, { ico: 'alert', label: 'شواهد تحتاج استكمالاً', v: evFix, tone: 'warn', href: '#inds/evidence/needs_completion' }])}`)}

  <section class="win w-cal"><header><span class="db-gi">${ico('cal')}</span><h2>التقويم والأجندة</h2><a class="btn sm" href="#team/cal">تقويم الفريق</a></header>
    <div class="wc"><div id="wcal" class="calbox">${calHtml()}</div><div id="wag" class="agbox">${agHtml()}</div></div></section>

  ${win('w-team', 'task', 'إدارة الفريق', '#team/overview', 'فتح إدارة الفريق',
    h`<ul class="wl"><li><span>${ico('cal')} الاجتماع القادم</span><b>${nextM ? h`<a href="#meeting/${nextM.id}">${nextM.title}</a> <small class="muted">${dt(nextM.meeting_date)}${nextM.start_time ? ' · ' + String(nextM.start_time).slice(0, 5) : ''}</small>` : h`<small class="muted">لا يوجد</small>`}</b></li>
    <li><span>${ico('visit')} الزيارة القادمة</span><b>${nextV ? h`<a href="#visit/${nextV.id}">${nextV.target_party || 'زيارة فنية'}</a> <small class="muted">${dt(nextV.visit_date)}</small>` : h`<small class="muted">لا يوجد</small>`}</b></li>
    <li><span>${ico('clip')} إجراءات زيارات مفتوحة</span><b>${nf(openCards)}</b></li></ul>
    <div class="wb"><a class="btn sm" href="#team/tasks">المهام</a><a class="btn sm" href="#team/meetings">الاجتماعات</a><a class="btn sm" href="#team/visits">الزيارات</a></div>
    ${nstrip([{ ico: 'clock', label: 'قيد التنفيذ', v: Math.max(tkRun, 0), tone: 'info', href: '#team/tasks' }, { ico: 'alert', label: 'متأخرة', v: tkLate, tone: 'bad', href: '#team/tasks' }, { ico: 'note', label: co ? 'بانتظار المراجعة' : 'مقترحة', v: co ? tkRev : tkProp, tone: 'warn', href: '#team/tasks' }, { ico: 'check', label: 'مكتملة', v: tkDone, tone: 'ok', href: '#team/tasks' }])}`)}

  ${win('w-plat', 'users', 'إدارة المنصة', '#platform/staff', 'فتح إدارة المنصة',
    h`${setup.length ? h`<h3 class="wh">يحتاج إعداداً</h3><ul class="wl">${setup.map(itemHtml)}</ul>` : h`<p class="muted empty">إعدادات المنصة مكتملة: كل المقيّمين لهم حسابات وكل المؤشرات مسندة.</p>`}
    <div class="wb">${[['assign', 'الإسناد'], ['cycles', 'الدورات'], ['ann', 'الإعلانات'], ['wa', 'واتساب']].filter(([t]) => App.teamTabAllowed(t)).map(([t, l]) => h`<a class="btn sm" href="#platform/${t}">${l}</a>`)}</div>
    ${nstrip([{ ico: 'users', label: 'منسوبون', v: staffAct, tone: 'info' }, ...(App.teamTabAllowed('staff') || role() === 'principal' ? [{ ico: 'user', label: 'حسابات فعّالة', v: accounts, tone: 'ok' }] : []), { ico: 'mega', label: 'إعلانات سارية', v: D.anns.length, tone: 'info', href: '#ann' }])}`)}

  ${win('w-rep', 'doc', 'التقارير وسجل النشاط', '#dashboard/reports', 'التقارير',
    log.length ? h`<ul class="wl log">${log.slice(0, 4).map(l => { const x = logLine(l, D); return h`<li><span><b>${x.who}</b> · ${x.what}</span><small class="muted">${ago(x.t)}</small></li>`; })}</ul><div class="wb"><a class="btn sm" href="#dashboard/log">سجل النشاط كاملاً</a></div>`
      : h`<p class="muted empty">تقارير الدورة والمجالات والمعايير والمؤشرات والشواهد والمهام للعرض والطباعة والتصدير.</p><div class="wb"><a class="btn sm" href="#dashboard/reports">فتح التقارير</a></div>`)}
  </div>`;
};

/* ===== صفحة التنبيهات ===== */
const AF = { sev: '' };
Act.dbAlertF = ({ f }) => { AF.sev = f; App.refresh(); };
Pages.alerts = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  const A = await App.alerts(); App.drawMenu?.();
  const SL = { '': 'الكل', bad: 'عاجل', warn: 'يحتاج متابعة', info: 'للعلم' };
  const groups = A.groups.map(g => ({ ...g, items: AF.sev ? g.items.filter(i => i.tone === AF.sev) : g.items })).filter(g => g.items.length);
  return h`${pageHead('التنبيهات والمتابعة', h`<span class="bdg ${A.total ? 'warn' : 'ok'}">${nf(A.total)} إجراء</span>`)}
  <div class="flt">${Object.entries(SL).map(([k, v]) => btn(`${v}${k ? ' (' + nf(A.bySev[k]) + ')' : ''}`, 'dbAlertF', { f: k }, AF.sev === k ? 'pri' : ''))}</div>
  ${groups.length ? h`<div class="db-ac one">${groups.map(g => groupCard(g, 999))}</div>` : h`<div class="pn"><p class="muted empty">لا توجد تنبيهات${AF.sev ? ' بهذه الدرجة' : ' الآن. كل ما يخصّك منجز'}.</p></div>`}
  <p class="muted">التنبيهات محسوبة مباشرة من بيانات الدورة الحالية وتتجدد عند كل إجراء. ما يظهر لك يتبع دورك: المنسق يرى ما ينتظر اعتماده، والعضو يرى ما يخصّه.</p>`;
};
})();
