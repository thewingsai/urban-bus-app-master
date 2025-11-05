(function(){
  async function j(url){ try{ const r=await fetch(url,{headers:{'Content-Type':'application/json'}}); return await r.json(); }catch(_){ return {}; } }
  function setMeta(name, content){ if(!content) return; let m=document.querySelector(`meta[name="${name}"]`); if(!m){ m=document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); } m.setAttribute('content', content); }
  function setOG(prop, content){ if(!content) return; let m=document.querySelector(`meta[property="${prop}"]`); if(!m){ m=document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); } m.setAttribute('content', content); }
  function ensureStyle(){ if(document.getElementById('ub-public-style')) return; const s=document.createElement('style'); s.id='ub-public-style'; s.textContent=`
    .ub-promo{position:sticky;top:40px;z-index:900;background:#0e1533;color:#fff;border-bottom:1px solid rgba(255,255,255,.1)}
    .ub-promo .inner{max-width:1100px;margin:0 auto;padding:8px 12px;font:500 13px/1.4 Inter,system-ui}
    .ub-hero{margin:12px auto 0;max-width:1100px;border-radius:14px;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,.08)}
    .ub-hero .bg{width:100%;height:220px;background:#0b1020 center/cover no-repeat}
    .ub-hero .content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:18px;color:#fff;background:linear-gradient(90deg,rgba(0,0,0,.55),rgba(0,0,0,.15))}
    .ub-hero h1{margin:0 0 6px;font:700 24px/1.2 Inter,system-ui}
    .ub-hero p{margin:0 0 10px;font:400 14px/1.5 Inter,system-ui;opacity:.9}
    .ub-hero a{align-self:flex-start;background:#1d4ed8;color:#fff;padding:8px 12px;border-radius:8px;text-decoration:none}
    .ub-pay-btn{margin-left:auto;display:inline-block;background:#1d4ed8;color:#fff;padding:6px 10px;border-radius:8px;text-decoration:none;border:1px solid rgba(255,255,255,.15);font:600 13px/1 Inter,system-ui}
    .ub-pay-btn:hover{opacity:.95}
    @media(min-width:900px){ .ub-hero .bg{height:300px} .ub-hero h1{font-size:28px} }
  `; document.head.appendChild(s); }
  function addPromo(text){ if(!text) return; ensureStyle(); if(document.querySelector('.ub-promo')) return; const bar=document.createElement('div'); bar.className='ub-promo'; bar.innerHTML=`<div class="inner">${text}</div>`; const header=document.getElementById('ub-global-header')||document.querySelector('.topbar'); if(header) header.after(bar); else document.body.prepend(bar); }
  function addHero(item){ if(!item) return; ensureStyle(); if(document.getElementById('ub-hero')) return; const wrap=document.createElement('section'); wrap.id='ub-hero'; wrap.className='ub-hero'; wrap.innerHTML=`<div class="bg" style="background-image:url('${(item.background_url||'').replace(/'/g,"%27")}')"></div><div class="content"><h1>${item.title||''}</h1>${item.subtitle?`<p>${item.subtitle}</p>`:''}${item.cta_href?`<a href="${item.cta_href}">${item.cta_text||'Book now'}</a>`:''}</div>`; const header=document.getElementById('ub-global-header')||document.querySelector('.topbar'); if(header) header.after(wrap); else document.body.prepend(wrap); }
  function addFooter(html){ if(!html) return; if(document.getElementById('ub-footer-html')) return; const f=document.createElement('div'); f.id='ub-footer-html'; f.innerHTML=html; document.body.appendChild(f); }
  function addPaymentLink(url){ if(!url) return; ensureStyle(); if(document.querySelector('.ub-pay-btn')) return; const container = document.querySelector('#ub-global-header .inner') || document.querySelector('.topbar .inner'); if(!container) return; const a=document.createElement('a'); a.className='ub-pay-btn'; a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent='Pay Now'; container.appendChild(a); }

  document.addEventListener('DOMContentLoaded', async ()=>{
    try {
      const s = await j('/api/site-settings.php'); const it = s.item||{};
      if(it.seo_title && (!document.title || document.title.includes('UrbanBus'))) document.title = it.seo_title;
      if(it.seo_description) setMeta('description', it.seo_description);
      if(it.og_image) setOG('og:image', it.og_image);
      addFooter(it.footer_html||'');
    } catch(_){ }

    try {
      const h = await j('/api/site-hero.php'); const item=(h.items||[])[0]; if(item) addHero(item);
    } catch(_){ }

    try {
      const o = await j('/api/site-offers.php'); const first=(o.items||[])[0]; if(first){ const copy = first.title || (first.code?(`Use code ${first.code}`):''); addPromo(copy); }
    } catch(_){ }

    // Remove any global Pay button unless explicitly on checkout view
    (function(){ const btn=document.querySelector('.ub-pay-btn'); if(btn){ const inCheckout=document.querySelector('[data-ub-pay]')||document.getElementById('ub-pay'); if(!inCheckout) btn.remove(); }})();

    // PayU wiring for booking "Pay" button (only explicit targets)
    (function(){
      function parseAmountFromText(t){ if(!t) return 0; const cleaned=String(t).replace(/[,\s₹]/g,''); if(!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return 0; return Number(cleaned); }
      function pick(sel){ return document.querySelector(sel); }
      function val(el){ if(!el) return ''; return ('value' in el)? (el.value||'') : (el.textContent||''); }
      function findAmount(el){
        // Require explicit amount source to avoid wrong values
        let v = el?.getAttribute?.('data-amount'); if(v){ const n=parseAmountFromText(v); if(n>0) return n; }
        const n1 = pick('#checkout-total'); if(n1){ const a=parseAmountFromText(val(n1)); if(a>0) return a; }
        const n2 = pick('[data-total]'); if(n2){ const a=parseAmountFromText(val(n2)); if(a>0) return a; }
        return 0;
      }
      function findTextInput(...names){ for(const n of names){ const el = pick(`[name=\"${n}\"]`)||pick(`#${n}`)||pick(`[data-${n}]`); if(el){ const v=val(el).trim(); if(v) return v; } } return ''; }
      function launchPayU(params){
        const q = new URLSearchParams();
        q.set('amount', String(params.amount.toFixed ? params.amount.toFixed(2) : params.amount));
        if(params.name) q.set('name', params.name);
        if(params.email) q.set('email', params.email);
        if(params.phone) q.set('phone', params.phone);
        if(params.bookingId) q.set('bookingId', params.bookingId);
        if(params.productinfo) q.set('productinfo', params.productinfo);
        window.location.href = '/api/create-payu-order.php?' + q.toString();
      }
      window.UrbanBusPayU = { launch: launchPayU };
      document.addEventListener('click', function(e){
        const target = e.target.closest('[data-ub-pay],#ub-pay');
        if(!target) return;
        e.preventDefault();
        // Require passenger details
        const name = findTextInput('passenger_name','name','firstname','customerName');
        const email = findTextInput('passenger_email','email','customerEmail');
        const phone = findTextInput('passenger_phone','phone','mobile','customerMobile');
        if(!name || !email || !phone){ alert('Please fill passenger name, email, and phone before paying.'); return; }
        const amount = findAmount(target);
        if(!(amount>0)){ alert('Unable to determine total amount for payment.'); return; }
        const bookingId = (pick('[data-booking-id]')?.getAttribute('data-booking-id')) || val(pick('#bookingId')) || '';
        launchPayU({ amount, name, email, phone, bookingId, productinfo: 'UrbanBus Ticket' });
      }, true);
    })();
  });
})();
