/* قائمة الترويسة في الصفحات الثابتة (تحليل النتائج): تُظهر «لوحة التحكم» و«خروج» لمن سجّل دخوله، و«دخول» لغيره.
   تستخدم الجلسة نفسها المخزّنة للموقع، ولا تغيّر أي بيانات. */
(async () => {
  const login = document.getElementById('loginLink'), adm = document.getElementById('adminLink');
  if (!login || !window.supabase || !window.APP_CONFIG) return;
  try {
    const sb = supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey);
    const { data } = await sb.auth.getSession(); const s = data.session; if (!s) return;
    const { data: p } = await sb.from('profiles').select('role').eq('id', s.user.id).maybeSingle();
    if (adm && p && ['coordinator', 'team_member', 'principal', 'reviewer'].includes(p.role)) adm.hidden = false;
    login.textContent = 'خروج'; login.setAttribute('href', '#');
    login.addEventListener('click', async e => { e.preventDefault(); await sb.auth.signOut(); location.reload(); });
  } catch (e) { /* تبقى القائمة بحالتها الافتراضية */ }
})();
