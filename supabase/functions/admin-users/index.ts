// دالة خادم: إنشاء حسابات المستخدمين وإيقافها وتغيير كلمات المرور. للمنسق فقط. مفتاح الخدمة يبقى في بيئة الدالة.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const ROLES = ['coordinator', 'team_member', 'external_evaluator', 'principal', 'reviewer'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: 'غير مصرح' }, 401);
    const { data: me } = await admin.from('profiles').select('role,is_active').eq('id', u.user.id).maybeSingle();
    if (!me || !me.is_active || me.role !== 'coordinator') return json({ error: 'للمنسق فقط' }, 403);
    const b = await req.json();
    if (b.action === 'create_user') {
      if (!ROLES.includes(b.role)) return json({ error: 'دور غير صالح' }, 400);
      if (!b.email || !b.password || String(b.password).length < 10) return json({ error: 'البريد وكلمة مرور من 10 أحرف على الأقل مطلوبان' }, 400);
      if (b.role === 'external_evaluator' && b.staff_id) return json({ error: 'المقيم الخارجي لا يرتبط بمنسوب' }, 400);
      if (b.role !== 'external_evaluator' && !b.staff_id) return json({ error: 'اختر المنسوب' }, 400);
      const { data: c, error } = await admin.auth.admin.createUser({ email: b.email, password: b.password, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      const { error: pe } = await admin.from('profiles').insert({ id: c.user.id, role: b.role, staff_id: b.staff_id || null, display_name: b.display_name || null });
      if (pe) { await admin.auth.admin.deleteUser(c.user.id); return json({ error: pe.message }, 400); }
      return json({ ok: true, id: c.user.id });
    }
    if (b.action === 'set_active') {
      if (b.id === u.user.id) return json({ error: 'لا يمكنك إيقاف حسابك' }, 400);
      const { error } = await admin.from('profiles').update({ is_active: !!b.active }).eq('id', b.id);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }
    if (b.action === 'reset_password') {
      if (!b.password || String(b.password).length < 10) return json({ error: 'كلمة المرور 10 أحرف على الأقل' }, 400);
      const { error } = await admin.auth.admin.updateUserById(b.id, { password: b.password });
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }
    return json({ error: 'إجراء غير معروف' }, 400);
  } catch (e) { return json({ error: String(e) }, 500); }
});
