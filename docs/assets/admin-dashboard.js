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
      sub: `${e.achievement_pct != null ? nf(Math.round(e.achievement_pct)) + '٪' : 'بلا نسبة'}${lvl(e.level_id) ? ' · ' + lvl(e.level_id) : ''} · أُرسل ${ago(e.updated_at)}`,
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
App.alerts = async () => { const D = await App.data(); const A = buildAlerts(D); App.alertCount = A.total; return A; };

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
const ring = (p, label, sub, tone) => {
  const v = p == null ? 0 : Math.max(0, Math.min(100, p)), C = 2 * Math.PI * 34;
  return h`<div class="db-ring ${tone}"><div class="db-rg"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="t" cx="40" cy="40" r="34"/><circle class="v" cx="40" cy="40" r="34" stroke-dasharray="${(v / 100 * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg><b>${p == null ? '—' : nf(Math.round(p)) + '٪'}</b></div><strong>${label}</strong><small>${sub}</small></div>`;
};
const donut = segs => {
  const tot = segs.reduce((s, x) => s + x.n, 0), C = 2 * Math.PI * 42; let off = 0;
  const arcs = tot ? segs.filter(x => x.n).map(x => { const len = x.n / tot * C, el = h`<circle class="${x.cls}" cx="60" cy="60" r="42" stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 60 60)"/>`; off += len; return el; }) : [];
  return h`<svg viewBox="0 0 120 120" class="db-donut" role="img" aria-label="توزيع حالة المؤشرات"><circle class="bg" cx="60" cy="60" r="42"/>${arcs}<text x="60" y="58" text-anchor="middle" class="n">${nf(tot)}</text><text x="60" y="76" text-anchor="middle" class="u">مؤشراً</text></svg>`;
};
function weekly(c, D) {
  if (!c.start_date || !c.end_date) return null;
  const s = midnight(c.start_date), e = midnight(c.end_date), W = 7 * MS, n = Math.min(52, Math.max(1, Math.ceil((e - s + MS) / W)));
  const idx = d => { const k = Math.floor((new Date(d) - s) / W); return k < 0 ? 0 : k >= n ? n - 1 : k; };
  const B = Array.from({ length: n }, () => ({ a: 0, b: 0, c: 0 }));
  D.evals.filter(x => x.status === 'approved' && x.approved_at).forEach(x => B[idx(x.approved_at)].a++);
  D.evid.filter(x => x.status === 'approved' && x.reviewed_at).forEach(x => B[idx(x.reviewed_at)].b++);
  D.tasks.filter(x => x.approval === 'approved' && x.status === 'completed' && x.completed_at).forEach(x => B[idx(x.completed_at)].c++);
  const now = new Date(), cur = now < s ? -1 : now > new Date(e.getTime() + MS) ? n - 1 : Math.min(n - 1, Math.floor((now - s) / W));
  return { B, n, cur, max: Math.max(1, ...B.map(x => x.a + x.b + x.c)) };
}
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

/* ===== لوحة المتابعة ===== */
Pages.dashboard = async () => {
  const nc = App.needCycle(); if (nc) return nc;
  const [D, A] = await Promise.all([App.data(), App.alerts()]); App.drawMenu?.();
  const { ref, ov, evals, evid, tasks, lvs, om } = D, c = App.cycle(), T = tod();
  const cnt = k => ov.filter(o => o.eval_status === k).length;
  const total = ov.length, apr = cnt('approved'), sub = cnt('submitted'), drf = cnt('draft'), nev = cnt('not_evaluated');
  const evPend = evid.filter(e => ['new', 'under_review'].includes(e.status)).length;

  // الحلقات: الإنجاز، الزمن المنقضي، الالتزام بالجدول
  let tp = null, tsub = 'حدّد بداية الدورة ونهايتها';
  if (c.start_date && c.end_date) { const dd = Math.max(1, Math.round((midnight(c.end_date) - midnight(c.start_date)) / MS) + 1), el = Math.round((midnight(T) - midnight(c.start_date)) / MS) + 1; tp = Math.max(0, Math.min(100, el / dd * 100)); tsub = `${nf(Math.max(0, Math.min(dd, el)))} من ${nf(dd)} يوماً`; }
  const dueTasks = tasks.filter(t => t.approval === 'approved' && t.due_date && (t.status === 'completed' || dayDiff(t.due_date) <= 0));
  const onTime = dueTasks.filter(t => t.status === 'completed' && t.completed_at && dayDiff(t.completed_at) <= dayDiff(t.due_date)).length;
  const wk = weekly(c, D);
  const dateG = new Date().toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // بطاقات الحالة
  const kp = [
    { l: 'كل المؤشرات', n: total, s: 'مؤشرات الدورة', t: 'brand', p: 100, i: 'layers' }, { l: 'معتمد', n: apr, s: 'تقييم معتمد نهائياً', t: 'ok', p: pctOf(apr, total), i: 'check' },
    { l: 'بانتظار الاعتماد', n: sub, s: 'أُرسلت للمراجعة', t: 'info', p: pctOf(sub, total), i: 'clock' }, { l: 'قيد التقييم', n: drf, s: 'مسودات لم تُرسل', t: 'warn', p: pctOf(drf, total), i: 'note' },
    { l: 'لم يُقيَّم', n: nev, s: 'لم يبدأ تقييمها', t: 'mute', p: pctOf(nev, total), i: 'flag' }, { l: 'شواهد تنتظر المراجعة', n: evPend, s: `من ${nf(evid.length)} شاهداً`, t: evPend ? 'bad' : 'ok', p: pctOf(evPend, evid.length), i: 'clip' },
  ];
  // المجالات
  const doms = ref.domains.map((d, i) => {
    const rs = ov.filter(o => o.domain_id === d.id), cn = k => rs.filter(o => o.eval_status === k).length, a = cn('approved');
    const v = rs.filter(o => o.eval_status === 'approved' && o.achievement_pct != null).map(o => Number(o.achievement_pct)), avg = v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
    return { d, i, n: rs.length, a, s: cn('submitted'), r: cn('draft'), z: cn('not_evaluated'), avg, lv: avg == null ? null : lvs.find(l => avg >= Number(l.min_pct)) || lvs[lvs.length - 1] };
  });
  // أحدث المنجزات
  const recent = evals.filter(e => e.status === 'approved' && e.approved_at).sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at)).slice(0, 6);
  // فريق التنفيذ
  const by = {}; const slot = s => (by[s] ||= { ev: new Set(), rs: new Set() });
  D.resp.forEach(r => (r.kind === 'evaluator' ? slot(r.staff_id).ev : slot(r.staff_id).rs).add(r.indicator_id));
  tasks.filter(t => t.approval === 'approved' && t.assignee_staff_id).forEach(t => slot(t.assignee_staff_id));
  const team = Object.entries(by).map(([id, o]) => {
    const st = S.staff.find(s => s.id === id); if (!st) return null; const ev = [...o.ev], tk = tasks.filter(t => t.approval === 'approved' && t.assignee_staff_id === id);
    const cn = k => ev.filter(i => om[i]?.eval_status === k).length;
    return { id, st, ne: ev.length, nr: o.rs.size, a: cn('approved'), s: cn('submitted'), td: tk.filter(t => t.status === 'completed').length, tl: tk.filter(t => !['completed', 'cancelled'].includes(t.status) && t.due_date && dayDiff(t.due_date) < 0).length, tn: tk.length };
  }).filter(Boolean).sort((x, y) => y.tl - x.tl || y.s - x.s || x.st.full_name.localeCompare(y.st.full_name, 'ar'));
  // الإعلانات
  const co = isCoord(), readSet = new Set(D.reads.filter(r => r.profile_id === S.me.id).map(r => r.announcement_id)), isRead = a => readSet.has(a.id);
  const strip = D.anns.filter(a => a.priority !== 'normal' && (co || !isRead(a)));
  const accounts = D.profs.filter(p => p.is_active && p.role !== 'external_evaluator').length;

  return h`
  ${strip.length ? h`<div class="db-strip" role="region" aria-label="إعلانات مهمة">${ico('mega')}<div>${strip.slice(0, 3).map(a => h`<a href="#ann" class="${a.priority}"><b>${L.prio[a.priority]}:</b> ${a.title}</a>`)}</div></div>` : ''}
  <section class="db-hero"><div class="db-ht"><small>لوحة التحكم</small><h1>متابعة التقويم الذاتي</h1><p class="muted">${dateG}${wk ? ` · الأسبوع ${nf(Math.max(1, wk.cur + 1))} من ${nf(wk.n)}` : ''}</p>
    <div class="chips"><span class="db-chip">${ico('layers')} ${c.name} ${sb_('cycle', c.status)}</span><span class="db-chip">${nf(total)} مؤشراً · ${nf(ref.domains.length)} مجالات</span>
    <a class="db-chip ${A.total ? 'warn' : 'ok'}" href="#alerts">${ico('bell')} ${A.total ? nf(A.total) + ' تحتاج إجراء' : 'لا إجراءات معلّقة'}</a></div></div>
    <div class="db-rings">${ring(pctOf(apr, total), 'نسبة الإنجاز', `${nf(apr)} من ${nf(total)} مؤشراً معتمداً`, 'ok')}${ring(tp, 'الزمن المنقضي', tsub, 'info')}${ring(dueTasks.length ? pctOf(onTime, dueTasks.length) : null, 'الالتزام بالجدول', dueTasks.length ? `${nf(onTime)} من ${nf(dueTasks.length)} مهمة في موعدها` : 'لا مهام مستحقة بعد', 'brand')}</div></section>
  <div class="db-kpis">${kp.map(k => h`<a class="db-k ${k.t}" href="${k.i === 'clip' ? '#evidence' : '#inds'}"><span class="db-ki">${ico(k.i)}</span><small>${k.l}</small><b>${nf(k.n)}</b><div class="db-pb"><span style="width:${k.p}%"></span></div><em>${k.s}</em></a>`)}</div>

  <section class="pn"><div class="pnh"><h2>${ico('bell')} مركز المتابعة: ما ينتظر إجراءً</h2><div class="pa"><span class="bdg bad">${nf(A.bySev.bad)} عاجل</span><span class="bdg warn">${nf(A.bySev.warn)} يحتاج متابعة</span><span class="bdg">${nf(A.bySev.info)} للعلم</span><a class="btn sm" href="#alerts">كل التنبيهات</a></div></div>
    ${A.groups.length ? h`<div class="db-ac">${A.groups.map(g => groupCard(g, 4))}</div>` : h`<p class="muted empty">لا توجد إجراءات معلّقة عليك في هذه الدورة.</p>`}</section>

  ${panel('الإعلانات', D.anns.length ? h`<div class="db-anns">${D.anns.slice(0, 4).map(a => h`<article class="db-an ${a.priority}"><header><b>${a.title}</b>${a.priority !== 'normal' ? badge(L.prio[a.priority], a.priority === 'urgent' ? 'bad' : 'warn') : ''}${!co && !isRead(a) ? h`<span class="db-dot" title="لم تطّلع عليه"></span>` : ''}</header>
      <p>${short(a.body, 170)}</p><footer><small class="muted">${dtt(a.publish_at)}</small>${co ? btn(`المطّلعون (${nf(D.reads.filter(r => r.announcement_id === a.id).length)}${accounts ? ' من ' + nf(accounts) : ''})`, 'dbAnnWho', { i: a.id }) : (isRead(a) ? badge('اطّلعت', 'ok') : btn('تعليم كمقروء', 'dbAnnRead', { i: a.id }, 'pri'))}</footer></article>`)}</div>` : h`<p class="muted empty">لا توجد إعلانات سارية.</p>`,
    h`<a class="btn sm" href="#ann">${co ? 'إدارة الإعلانات' : 'كل الإعلانات'}</a>`)}

  ${recent.length ? panel('أحدث المنجزات', h`<div class="db-rec">${recent.map(e => { const r = ref.im[e.indicator_id], di = Math.max(0, ref.domains.findIndex(d => d.id === r?.dom?.id)) % 4; return h`<a class="db-rc" style="--b:var(--c${di}b);--f:var(--c${di}f)" href="#ind/${e.indicator_id}"><span class="db-rcc" dir="ltr">${r?.code}</span><b>${short(r?.official_text, 70)}</b><small>${e.achievement_pct != null ? nf(Math.round(e.achievement_pct)) + '٪ · ' : ''}${lvs.find(l => l.id === e.level_id)?.label_ar || ''}</small><small class="muted">${ago(e.approved_at)}</small></a>`; })}</div>`) : ''}

  <h2 class="db-sec">التحليل <small>صورة شاملة لسير التقويم</small></h2>
  ${panel('مسار الإنجاز عبر أسابيع الدورة', wk ? h`<div class="db-leg"><span class="a">تقييمات معتمدة</span><span class="b">شواهد معتمدة</span><span class="c">مهام مكتملة</span></div>
    <div class="db-wk" role="img" aria-label="الإنجاز الأسبوعي">${wk.B.map((x, i) => h`<div class="${i === wk.cur ? 'cur' : ''}"><div class="stk" title="الأسبوع ${nf(i + 1)}: ${nf(x.a)} تقييم، ${nf(x.b)} شاهد، ${nf(x.c)} مهمة">${x.a + x.b + x.c ? h`<i class="a" style="height:${x.a / wk.max * 100}%"></i><i class="b" style="height:${x.b / wk.max * 100}%"></i><i class="c" style="height:${x.c / wk.max * 100}%"></i>` : ''}</div><small>${nf(i + 1)}</small></div>`)}</div>` : h`<p class="muted empty">حدّد تاريخ بداية الدورة ونهايتها من «دورات التقويم» ليظهر المسار الأسبوعي.</p>`)}
  <div class="two">
    ${panel('توزيع الحالة', h`<div class="db-dn">${donut([{ n: apr, cls: 'ok' }, { n: sub, cls: 'info' }, { n: drf, cls: 'warn' }, { n: nev, cls: 'mute' }])}<ul class="db-lg">${[['ok', 'معتمد', apr], ['info', 'بانتظار الاعتماد', sub], ['warn', 'قيد التقييم', drf], ['mute', 'لم يُقيَّم', nev]].map(([k, l, n]) => h`<li><i class="${k}"></i>${l}<b>${nf(n)}</b><small>${nf(pctOf(n, total))}٪</small></li>`)}</ul></div>`)}
    ${panel('تقدم المجالات', h`<div class="db-doms">${doms.map(x => h`<div class="db-dom" style="--b:var(--c${x.i % 4}b);--f:var(--c${x.i % 4}f)"><div class="db-dh"><b>${x.d.name_ar}</b>${x.avg == null ? h`<span class="muted">—</span>` : h`<span class="ires"><b>${nf(Math.round(x.avg))}٪</b><span class="lvl ${x.lv?.code || 'none'}">${x.lv?.label_ar || ''}</span></span>`}</div>
      <div class="db-st" title="معتمد ${x.a} · بانتظار ${x.s} · مسودة ${x.r} · لم يُقيَّم ${x.z}"><i class="ok" style="flex:${x.a}"></i><i class="info" style="flex:${x.s}"></i><i class="warn" style="flex:${x.r}"></i><i class="mute" style="flex:${x.z}"></i></div>
      <small class="muted">${nf(x.a)} معتمد من ${nf(x.n)} · ${nf(x.s)} بانتظار الاعتماد</small></div>`)}</div>`)}
  </div>
  ${D.log.length ? panel('آخر التعديلات', h`<ul class="db-log">${D.log.map(l => { const x = logLine(l, D); return h`<li><span><b>${x.who}</b> · ${x.what}</span><small class="muted">${ago(x.t)}</small></li>`; })}</ul>`, h`<a class="btn sm" href="#log">سجل النشاط</a>`) : ''}

  <h2 class="db-sec">فريق التنفيذ</h2>
  ${panel('أداء الفريق', table([
    { h: 'المنسوب', f: r => h`<span class="db-av">${(r.st.full_name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')}</span> <b>${r.st.full_name}</b><br><small class="muted">${r.st.job_title || ''}</small>` },
    { h: 'مقيّم', f: r => nf(r.ne) }, { h: 'مسؤول', f: r => nf(r.nr) }, { h: 'معتمد', f: r => nf(r.a) }, { h: 'بانتظار الاعتماد', f: r => r.s ? badge(nf(r.s), 'warn') : '0' },
    { h: 'مهام مكتملة', f: r => `${nf(r.td)} / ${nf(r.tn)}` }, { h: 'متأخرة', f: r => r.tl ? badge(nf(r.tl), 'bad') : '0' },
    { h: 'الإنجاز', f: r => r.ne ? h`<div class="db-pr"><div class="bar2"><span style="width:${pctOf(r.a, r.ne)}%"></span></div><span>${nf(pctOf(r.a, r.ne))}٪</span></div>` : h`<span class="muted">—</span>` },
    { h: '', f: r => h`<a class="btn sm" href="#assign/${r.id}">المسؤوليات</a>` },
  ], team, 'لم يُسنَد أي مؤشر أو مهمة بعد. ابدأ من «إدارة المسؤوليات».'), h`<small class="muted">${nf(team.length)} منسوباً</small>`)}`;
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
