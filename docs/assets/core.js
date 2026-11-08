/* النواة المشتركة: الاتصال، القوالب الآمنة، النوافذ والنماذج، التسميات، عارض الشواهد */
(() => {
const sb = supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);

// ===== قوالب HTML آمنة: كل قيمة مُدرجة تُهرَّب تلقائياً إلا إن كانت ناتج h أو raw =====
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const part = v => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join('') : esc(v);
const h = (strs, ...vals) => new Raw(strs.reduce((a, s, i) => a + s + (i < vals.length ? part(vals[i]) : ''), ''));
const raw = s => new Raw(s);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const put = (el, x) => { el.innerHTML = x instanceof Raw ? x.s : esc(x); };

// ===== تسميات =====
const L = {
  eval: { draft: 'مسودة', submitted: 'مُرسل للمراجعة', approved: 'معتمد', not_evaluated: 'لم يُقيَّم' },
  evid: { new: 'جديد', under_review: 'قيد المراجعة', approved: 'معتمد', needs_completion: 'يحتاج استكمالاً', rejected: 'مرفوض' },
  cycle: { draft: 'مسودة', active: 'نشطة', paused: 'متوقفة مؤقتاً', closed: 'مغلقة' },
  task: { new: 'جديدة', in_progress: 'قيد التنفيذ', awaiting_review: 'بانتظار المراجعة', completed: 'مكتملة', overdue: 'متأخرة', cancelled: 'ملغاة' },
  ttype: { administrative: 'إدارية', documentation: 'توثيقية', followup: 'متابعة', technical_visit: 'زيارة فنية', development: 'تطويرية' },
  appr: { proposed: 'مقترحة', approved: 'معتمدة', rejected: 'مرفوضة' },
  meet: { draft: 'مسودة', scheduled: 'مجدول', held: 'عُقد', cancelled: 'ملغى' },
  rsvp: { pending: 'لم يردّ', confirmed: 'أكّد الحضور', declined: 'اعتذر' },
  visit: { planned: 'مخططة', done: 'تمت', cancelled: 'ملغاة' },
  follow: { open: 'مفتوحة', in_progress: 'قيد المتابعة', closed: 'مغلقة' },
  prio: { normal: 'عادي', important: 'مهم', urgent: 'عاجل' },
  role: { coordinator: 'منسق التقويم', team_member: 'عضو فريق', external_evaluator: 'مقيم خارجي', principal: 'مدير المدرسة', reviewer: 'مراجع' },
  kind: { responsible: 'مسؤول', evaluator: 'مقيّم' },
  wa: { queued: 'في الانتظار', sent: 'أُرسلت', delivered: 'وصلت', failed: 'فشلت', skipped: 'تُجوهلت' },
};
const lab = (m, k) => L[m][k] ?? k ?? '—';
const opts = m => Object.entries(L[m]);
const nf = n => (n == null ? '—' : Number(n).toLocaleString('ar-SA'));
const dt = d => d ? new Date(d.length <= 10 ? d + 'T00:00:00' : d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const dtt = d => d ? new Date(d).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const today = () => new Date().toISOString().slice(0, 10);
const codeCmp = (a, b) => String(a).localeCompare(String(b), 'en', { numeric: true });

// ===== الحالة العامة =====
const S = { me: null, cycles: [], staff: [], cid: null, ind: [] };
const staffName = id => S.staff.find(s => s.id === id)?.full_name || '—';
const staffOpts = (only = null) => S.staff.filter(s => s.is_active && (!only || only(s))).map(s => [s.id, s.full_name]);
const cycle = () => S.cycles.find(c => c.id === S.cid);
const role = () => S.me?.role;
const isCoord = () => role() === 'coordinator';
const canReview = () => ['coordinator', 'principal', 'reviewer'].includes(role());

// ===== إشعارات =====
function toast(msg, bad) {
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); setTimeout(() => t.remove(), 4200);
}
const errMsg = e => ({
  '42501': 'ليست لديك صلاحية لهذا الإجراء',
  '23505': 'السجل موجود مسبقاً',
  '23503': 'السجل مرتبط ببيانات أخرى',
  '23514': 'قيمة غير مقبولة',
}[e?.code] || e?.message || 'تعذّر تنفيذ العملية');
// ينفّذ طلباً ويعرض الخطأ؛ يعيد البيانات أو null
async function run(p, okMsg) {
  const r = await p;
  if (r.error) { toast(errMsg(r.error), true); console.error(r.error); return null; }
  if (okMsg) toast(okMsg);
  return r.data ?? true;
}
async function must(p) { const r = await p; if (r.error) throw r.error; return r.data; }

// ===== النوافذ والنماذج =====
let modalEl;
function closeModal() { modalEl?.remove(); modalEl = null; document.body.classList.remove('noscroll'); }
function modal(title, body, { wide } = {}) {
  closeModal();
  modalEl = document.createElement('div'); modalEl.className = 'ov';
  modalEl.innerHTML = `<div class="md${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><b>${esc(title)}</b><button class="x" type="button" data-close aria-label="إغلاق">✕</button></div><div class="mb"></div></div>`;
  put($('.mb', modalEl), body);
  modalEl.addEventListener('mousedown', e => { if (e.target === modalEl) closeModal(); });
  modalEl.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(modalEl); document.body.classList.add('noscroll');
  return $('.mb', modalEl);
}
function fieldHtml(f, v) {
  const id = 'f_' + f.k, val = v ?? f.def ?? '', req = f.req ? ' required' : '', ph = f.ph ? ` placeholder="${esc(f.ph)}"` : '';
  let c;
  if (f.t === 'textarea') c = `<textarea id="${id}" rows="${f.rows || 4}"${req}${ph}>${esc(val)}</textarea>`;
  else if (f.t === 'select') c = `<select id="${id}"${req}>${f.req ? '' : '<option value="">—</option>'}${f.o.map(([a, b]) => `<option value="${esc(a)}"${String(a) === String(val) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
  else if (f.t === 'checkbox') return `<label class="chk"><input type="checkbox" id="${id}"${val ? ' checked' : ''}> ${esc(f.l)}</label>`;
  else if (f.t === 'multi') { const sel = new Set(val || []); c = `<div class="multi" id="${id}">${f.o.map(([a, b]) => `<label class="chk"><input type="checkbox" value="${esc(a)}"${sel.has(a) ? ' checked' : ''}> ${esc(b)}</label>`).join('')}</div>`; }
  else if (f.t === 'file') c = `<input type="file" id="${id}"${f.multiple ? ' multiple' : ''}${f.accept ? ` accept="${esc(f.accept)}"` : ''}${req}>`;
  else c = `<input id="${id}" type="${f.t || 'text'}" value="${esc(val)}"${req}${ph}${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''}${f.t === 'email' || f.t === 'password' ? ' dir="ltr"' : ''}${f.t === 'password' ? ' autocomplete="new-password"' : ''}>`;
  return `<label class="fld"><span>${esc(f.l)}${f.req ? ' *' : ''}</span>${c}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</label>`;
}
// نموذج عام: يعيد كائن القيم أو null عند الإلغاء
function ask(title, fields, values = {}, { submit = 'حفظ', wide } = {}) {
  return new Promise(res => {
    const body = modal(title, h`<form class="frm" novalidate>${raw(fields.map(f => fieldHtml(f, values[f.k])).join(''))}<div class="err" id="ferr" role="alert"></div><div class="acts"><button class="btn pri" type="submit">${submit}</button><button class="btn" type="button" data-close>إلغاء</button></div></form>`, { wide });
    let done = false;
    const fin = v => { if (done) return; done = true; closeModal(); res(v); };
    modalEl.addEventListener('click', e => { if (e.target.closest('[data-close]')) fin(null); });
    modalEl.addEventListener('mousedown', e => { if (e.target === modalEl) fin(null); });
    $('form', body).onsubmit = e => {
      e.preventDefault(); const out = {};
      for (const f of fields) {
        const el = $('#f_' + f.k, body);
        if (f.t === 'checkbox') out[f.k] = el.checked;
        else if (f.t === 'multi') out[f.k] = $$('input:checked', el).map(i => i.value);
        else if (f.t === 'file') out[f.k] = [...el.files];
        else if (f.t === 'number') out[f.k] = el.value === '' ? null : Number(el.value);
        else out[f.k] = el.value === '' ? null : el.value.trim();
        if (f.req && (out[f.k] == null || (Array.isArray(out[f.k]) && !out[f.k].length))) { $('#ferr', body).textContent = `الحقل «${f.l}» مطلوب`; el.focus(); return; }
      }
      fin(out);
    };
    $('input,select,textarea', body)?.focus();
  });
}
const sure = msg => Promise.resolve(window.confirm(msg));

// ===== جداول =====
const badge = (t, kind = '') => h`<span class="bdg ${kind}">${t}</span>`;
const stKind = { approved: 'ok', completed: 'ok', confirmed: 'ok', held: 'ok', done: 'ok', closed: 'ok', active: 'ok', delivered: 'ok', sent: 'ok',
  rejected: 'bad', overdue: 'bad', declined: 'bad', failed: 'bad', cancelled: 'bad', needs_completion: 'warn', awaiting_review: 'warn', submitted: 'warn',
  under_review: 'warn', paused: 'warn', pending: 'warn', proposed: 'warn', queued: 'warn' };
const sb_ = (m, k) => badge(lab(m, k), stKind[k] || '');
function table(cols, rows, empty = 'لا توجد بيانات') {
  if (!rows.length) return h`<p class="muted empty">${empty}</p>`;
  return h`<div class="tw"><table><thead><tr>${cols.map(c => h`<th>${c.h}</th>`)}</tr></thead><tbody>${rows.map(r => h`<tr>${cols.map(c => h`<td>${c.f(r)}</td>`)}</tr>`)}</tbody></table></div>`;
}
const btn = (label, a, data = {}, cls = '') => h`<button type="button" class="btn sm ${cls}" data-a="${a}" ${raw(Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' '))}>${label}</button>`;
const pageHead = (title, actions = '') => h`<div class="ph"><h1>${title}</h1><div class="pa">${actions}</div></div>`;
const panel = (title, body, actions = '') => h`<section class="pn"><div class="pnh"><h2>${title}</h2><div class="pa">${actions}</div></div>${body}</section>`;

// ===== التصدير =====
function csv(name, cols, rows) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const out = '﻿' + [cols.map(c => q(c.h)).join(','), ...rows.map(r => cols.map(c => q(c.x ? c.x(r) : '')).join(','))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'text/csv;charset=utf-8' })); a.download = name + '.csv'; a.click(); URL.revokeObjectURL(a.href);
}

// ===== عارض الشواهد (صور + PDF بـ PDF.js) =====
let pdfjs;
async function loadPdf() { if (!pdfjs) { pdfjs = await import('./pdfjs/pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = new URL('assets/pdfjs/pdf.worker.min.mjs', document.baseURI).href; } return pdfjs; }
async function openViewer(evidenceId, title, canDownload = true) {
  const { data: files, error } = await sb.from('evidence_files').select('*').eq('evidence_id', evidenceId).order('created_at');
  const body = modal(title || 'الشاهد', h`<div class="vw"><p class="muted">جارٍ التحميل…</p></div>`, { wide: true });
  const box = $('.vw', body);
  if (error || !files?.length) { put(box, h`<p class="muted">لا توجد ملفات مرفقة بهذا الشاهد.</p>`); return; }
  put(box, h`<div class="vtabs">${files.map((f, i) => h`<button type="button" class="btn sm${i ? '' : ' pri'}" data-i="${i}">${f.file_name}</button>`)}</div><div class="vbar" id="vbar"></div><div class="vstage" id="vstage"></div>`);
  const stage = $('#vstage', box), bar = $('#vbar', box);
  async function show(i) {
    $$('.vtabs button', box).forEach((b, j) => b.classList.toggle('pri', i === j));
    const f = files[i]; put(bar, ''); put(stage, h`<p class="muted">جارٍ تحميل الملف…</p>`);
    const dl = await sb.storage.from('evidence').download(f.storage_path);
    if (dl.error) { put(stage, h`<p class="err">تعذّر فتح الملف (الصلاحية أو الاتصال).</p>`); return; }
    const blob = dl.data, url = URL.createObjectURL(blob);
    const dlBtn = canDownload ? `<a class="btn sm" href="${url}" download="${esc(f.file_name)}">تنزيل</a>` : '';
    if ((f.mime_type || '').startsWith('image/')) {
      bar.innerHTML = `<button class="btn sm" data-z="-">−</button><button class="btn sm" data-z="+">+</button><button class="btn sm" data-z="0">ملاءمة</button> ${dlBtn}`;
      stage.innerHTML = `<img alt="${esc(f.file_name)}" src="${url}" class="vimg">`;
      const img = $('img', stage); let z = 1; bar.onclick = e => { const k = e.target.dataset.z; if (!k) return; z = k === '+' ? z * 1.25 : k === '-' ? z / 1.25 : 1; img.style.width = z === 1 ? '' : (z * 100) + '%'; img.style.maxWidth = z === 1 ? '100%' : 'none'; };
    } else if (f.mime_type === 'application/pdf') {
      const lib = await loadPdf(); const pdf = await lib.getDocument({ data: await blob.arrayBuffer() }).promise;
      let pg = 1, sc = 1.2;
      bar.innerHTML = `<button class="btn sm" data-p="1">السابقة</button><span id="pgn"></span><button class="btn sm" data-p="-1">التالية</button><button class="btn sm" data-z="-">−</button><button class="btn sm" data-z="+">+</button> ${dlBtn}`;
      stage.innerHTML = '<canvas class="vpdf"></canvas>';
      const cv = $('canvas', stage);
      const draw = async () => { const p = await pdf.getPage(pg); const vp = p.getViewport({ scale: sc }); cv.width = vp.width; cv.height = vp.height; await p.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise; $('#pgn', bar).textContent = `${nf(pg)} / ${nf(pdf.numPages)}`; };
      bar.onclick = e => { const t = e.target; if (t.dataset.p) { pg = Math.min(pdf.numPages, Math.max(1, pg - Number(t.dataset.p))); draw(); } if (t.dataset.z) { sc = Math.min(4, Math.max(.5, t.dataset.z === '+' ? sc * 1.2 : sc / 1.2)); draw(); } };
      draw();
    } else {
      bar.innerHTML = dlBtn; stage.innerHTML = `<p class="muted">لا تتوفر معاينة لهذا النوع (${esc(f.mime_type || '')}). ${canDownload ? 'يمكن تنزيله.' : ''}</p>`;
    }
  }
  $('.vtabs', box).onclick = e => { const b = e.target.closest('button[data-i]'); if (b) show(Number(b.dataset.i)); };
  show(0);
}

// الدخول باسم مستخدم (أو رقم هوية) أو ببريد: الاسم بلا @ يُحوَّل إلى البريد الداخلي الذي أنشأته دالة admin-users
const LOGIN_DOMAIN = 'labeed.local';
const loginEmail = id => { const v = String(id || '').trim().toLowerCase(); return v.includes('@') ? v : v + '@' + LOGIN_DOMAIN; };

window.Pages = {}; window.Act = {};
window.App = { loginEmail, sb, h, raw, esc, Raw, $, $$, put, L, lab, opts, nf, dt, dtt, today, codeCmp, S, staffName, staffOpts, cycle, role, isCoord, canReview,
  toast, errMsg, run, must, modal, closeModal, ask, sure, badge, sb_: sb_, table, btn, pageHead, panel, csv, openViewer };
})();
