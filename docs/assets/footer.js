/* تذييل موحّد للموقع ولوحة التحكم: هوية الجهة + شارة «أحد منتجات مختبر الأفكار».
   يستبدل أي تذييل قديم (footer.credit) ويُضاف في لوحة التحكم داخل #shell كي لا يظهر قبل الدخول. */
(() => {
  // رابط صفحة «كيف بُني المشروع»: اتركه فارغاً ليظهر الزر بحالة «قريباً»
  const ME_URL = 'https://i3zalmadeni.netlify.app/me';
  const HOW_URL = '';

  const logo = `<svg class="lf-logo" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="56" fill="#fff"/>
    <g class="lf-ring"><circle cx="60" cy="60" r="44" fill="none" stroke="#4fa39a" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 13.72"/></g>
    <text x="60" y="76" text-anchor="middle" font-family="Tajawal,sans-serif" font-size="50" font-weight="800" fill="#1b2a3a">ع</text>
    <g class="lf-orb"><circle cx="60" cy="16" r="6.5" fill="#e0955a"/></g>
  </svg>`;
  const ico = {
    user: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    layers: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>'
  };

  const how = HOW_URL
    ? `<a href="${HOW_URL}" target="_blank" rel="noopener">${ico.layers}<span>كيف بُني المشروع</span></a>`
    : `<span class="lf-soon" aria-disabled="true" title="قريباً">${ico.layers}<span>كيف بُني المشروع</span><em>قريباً</em></span>`;

  const html = `<footer class="credit lab-foot"><div class="wrap lf">
    <div class="lf-id">
      <span class="moe"><b>وزارة التعليم</b><small>Ministry of Education</small></span>
      <div class="mid"><b>مدرسة لبيد بن ربيعة المتوسطة</b><span>مدير المدرسة: خالد بن عبدالرحمن الباش</span><span>التقويم الذاتي الذكي – 1448هـ</span></div>
    </div>
    <div class="lf-card">
      <div class="lf-brand">${logo}<div><small>أحد منتجات مختبر الأفكار</small><b>عبدالعزيز بن يوسف المديني <i class="lf-ai">AI</i></b></div></div>
      <span class="lf-sep" aria-hidden="true"></span>
      <div class="lf-links" role="navigation" aria-label="عن المنتج">
        <a href="${ME_URL}" target="_blank" rel="noopener">${ico.user}<span>تعرّف علي</span></a>
        ${how}
      </div>
    </div>
  </div></footer>`;

  const mount = () => {
    document.querySelectorAll('footer.credit').forEach(f => f.remove());
    const host = document.getElementById('shell') || document.body;
    host.insertAdjacentHTML('beforeend', html);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
