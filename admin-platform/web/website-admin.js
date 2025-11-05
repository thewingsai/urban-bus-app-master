(function(){
  // Minimal website admin panel JS
  // Auth helpers (token or login)
  function sanitizeToken(s){ try { s = s.normalize('NFKC'); } catch(_){} return (s||'').replace(/[^\x20-\x7E]/g,'').trim(); }
  function getToken(){ return localStorage.getItem('admin_token') || ''; }
  function setToken(v){ localStorage.setItem('admin_token', sanitizeToken(v||'')); }
  function authHeaders(){ const t=sanitizeToken(getToken()); const h={ 'Content-Type': 'application/json' }; if(t) h['X-Admin-Token']=t; return h; }
  function withToken(url){ const t=sanitizeToken(getToken()); if(!t) return url; return url + (url.includes('?') ? '&' : '?') + 'admin_token=' + encodeURIComponent(t); }

  const els = {
    tabs: Array.from(document.querySelectorAll('.tab')),
    views: {
      site: document.getElementById('view-site'),
      hero: document.getElementById('view-hero'),
      pages: document.getElementById('view-pages'),
      offers: document.getElementById('view-offers'),
      routes: document.getElementById('view-routes'),
      schedules: document.getElementById('view-schedules'),
      payments: document.getElementById('view-payments'),
    },
    login: {
      email: document.getElementById('email'),
      password: document.getElementById('password'),
      button: document.getElementById('login'),
      status: document.getElementById('status'),
      tokenInput: document.getElementById('admin-token-input'),
      saveToken: document.getElementById('saveToken'),
    },
    site: {
      seoTitle: document.getElementById('site-seo-title'),
      seoDesc: document.getElementById('site-seo-desc'),
      phone: document.getElementById('site-phone'),
      email: document.getElementById('site-email'),
      whatsapp: document.getElementById('site-whatsapp'),
      og: document.getElementById('site-og'),
      footer: document.getElementById('site-footer'),
      save: document.getElementById('site-save'),
      load: document.getElementById('site-load'),
      msg: document.getElementById('site-msg'),
    },
    hero: {
      title: document.getElementById('hr-title'),
      subtitle: document.getElementById('hr-subtitle'),
      ctaText: document.getElementById('hr-cta-text'),
      ctaHref: document.getElementById('hr-cta-href'),
      bg: document.getElementById('hr-bg'),
      active: document.getElementById('hr-active'),
      start: document.getElementById('hr-start'),
      end: document.getElementById('hr-end'),
      save: document.getElementById('hr-save'),
      list: document.getElementById('hr-list'),
      msg: document.getElementById('hr-msg'),
      table: document.querySelector('#hr-table tbody'),
    },
    pages: {
      slug: document.getElementById('pg-slug'),
      title: document.getElementById('pg-title'),
      metaTitle: document.getElementById('pg-meta-title'),
      metaDesc: document.getElementById('pg-meta-desc'),
      html: document.getElementById('pg-html'),
      published: document.getElementById('pg-published'),
      publishAt: document.getElementById('pg-publish-at'),
      save: document.getElementById('pg-save'),
      list: document.getElementById('pg-list'),
      msg: document.getElementById('pg-msg'),
      table: document.querySelector('#pg-table tbody'),
    },
    offers: {
      code: document.getElementById('o-code'),
      type: document.getElementById('o-type'),
      amount: document.getElementById('o-amount'),
      active: document.getElementById('o-active'),
      from: document.getElementById('o-from'),
      to: document.getElementById('o-to'),
      save: document.getElementById('o-save'),
      list: document.getElementById('o-list'),
      msg: document.getElementById('o-msg'),
      table: document.querySelector('#o-table tbody'),
    },
    routes: {
      origin: document.getElementById('r-origin'),
      destination: document.getElementById('r-destination'),
      distance: document.getElementById('r-distance'),
      duration: document.getElementById('r-duration'),
      create: document.getElementById('r-create'),
      load: document.getElementById('r-load'),
      msg: document.getElementById('r-msg'),
      table: document.querySelector('#r-table tbody'),
    },
    schedules: {
      route: document.getElementById('s-route'),
      bus: document.getElementById('s-bus'),
      dep: document.getElementById('s-dep'),
      arr: document.getElementById('s-arr'),
      price: document.getElementById('s-price'),
      active: document.getElementById('s-active'),
      create: document.getElementById('s-create'),
      load: document.getElementById('s-load'),
      msg: document.getElementById('s-msg'),
      table: document.querySelector('#s-table tbody'),
      routeSearch: document.getElementById('s-route-search'),
      busSearch: document.getElementById('s-bus-search'),
      routesListEl: document.getElementById('routes-datalist'),
      busesListEl: document.getElementById('buses-datalist'),
    },
    payments: {
      status: document.getElementById('pm-status'),
      tx: document.getElementById('pm-tx'),
      load: document.getElementById('pm-load'),
      table: document.querySelector('#pm-table tbody'),
    },
  }

  function show(view){
    Object.entries(els.views).forEach(([k,el])=> el.classList.toggle('hidden', k!==view))
    els.tabs.forEach(b=> b.classList.toggle('active', b.dataset.view===view))
  }
  els.tabs.forEach(b=> b.addEventListener('click', ()=> show(b.dataset.view)))

  async function login(){
    els.login.status.textContent='Logging in...'
    try {
      const res = await fetch('/api/admin-login.php', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ username: (els.login.email.value||'').trim(), password: els.login.password.value||'' })
      })
      const data = await res.json().catch(()=>({}))
      if(!res.ok || data.success===false){ throw new Error('Login failed') }
      // Also store token for header/query auth for endpoints that support it
      const t = sanitizeToken(els.login.password.value||'')
      setToken(t)
      const secureAttr = (location.protocol === 'https:') ? '; Secure' : ''
      if (t) document.cookie = 'x_admin_token=' + encodeURIComponent(t) + '; Path=/; Max-Age=' + (30*24*60*60) + '; SameSite=Lax' + secureAttr
      els.login.status.textContent='Logged in'
    } catch(e){ els.login.status.textContent='Login error' }
  }
  els.login.button.addEventListener('click', login)
  els.login.saveToken.addEventListener('click', ()=>{
    const t = sanitizeToken(els.login.tokenInput?.value||'')
    setToken(t)
    const secureAttr = (location.protocol === 'https:') ? '; Secure' : ''
    if (t) document.cookie = 'x_admin_token=' + encodeURIComponent(t) + '; Path=/; Max-Age=' + (30*24*60*60) + '; SameSite=Lax' + secureAttr
    els.login.status.textContent = t ? 'Token saved' : 'Logged out'
  })

  // Site settings
  async function siteLoad(){ els.site.msg.textContent=''; try { const r=await fetch(withToken('/api/admin-site.php'), { headers: authHeaders(), credentials:'same-origin' }); const d=await r.json().catch(()=>({})); if(!r.ok||d.success===false){ els.site.msg.textContent='Error loading'; return; } const it=d.item||{}; els.site.seoTitle.value=it.seo_title||''; els.site.seoDesc.value=it.seo_description||''; els.site.phone.value=it.phone||''; els.site.email.value=it.email||''; els.site.whatsapp.value=it.support_whatsapp||''; els.site.og.value=it.og_image||''; els.site.footer.value=it.footer_html||''; els.site.msg.textContent='Loaded.'; } catch(_) { els.site.msg.textContent='Error'; } }
  async function siteSave(){ els.site.msg.textContent=''; try { const body={ seo_title:els.site.seoTitle.value, seo_description:els.site.seoDesc.value, phone:els.site.phone.value, email:els.site.email.value, support_whatsapp:els.site.whatsapp.value, og_image:els.site.og.value, footer_html:els.site.footer.value }; const r=await fetch(withToken('/api/admin-site.php'), { method:'POST', headers: authHeaders(), credentials:'same-origin', body: JSON.stringify(body) }); const d=await r.json().catch(()=>({})); if(!r.ok||d.success===false){ els.site.msg.textContent='Save error'; return; } els.site.msg.textContent='Saved.'; } catch(_) { els.site.msg.textContent='Error'; } }
  els.site.load.addEventListener('click', siteLoad)
  els.site.save.addEventListener('click', siteSave)

  // Hero
  function heroRow(it){ const tr=document.createElement('tr'); tr.innerHTML = `<td>${it.id||''}</td><td>${it.title||''}</td><td>${it.is_active?'Yes':'No'}</td><td>${it.start_at||''}</td><td>${it.end_at||''}</td>`; return tr }
  async function heroList(){ els.hero.msg.textContent=''; els.hero.table.innerHTML=''; try { const r=await fetch(withToken('/api/admin-hero.php'), { headers: authHeaders() }); const d=await r.json(); if(!r.ok||d.success===false){ els.hero.msg.textContent='Error'; return; } (d.items||[]).forEach(it=> els.hero.table.appendChild(heroRow(it))) } catch(_) { els.hero.msg.textContent='Error'; } }
  async function heroSave(){ els.hero.msg.textContent=''; const body={ title:els.hero.title.value.trim(), subtitle:els.hero.subtitle.value.trim(), cta_text:els.hero.ctaText.value.trim(), cta_href:els.hero.ctaHref.value.trim(), background_url:els.hero.bg.value.trim(), is_active:(els.hero.active.value==='true'), start_at:els.hero.start.value.trim()||null, end_at:els.hero.end.value.trim()||null }; try { const r=await fetch(withToken('/api/admin-hero.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const d=await r.json().catch(()=>({})); if(!r.ok||d.success===false){ els.hero.msg.textContent='Save error'; return; } els.hero.msg.textContent='Saved.'; heroList(); } catch(_) { els.hero.msg.textContent='Error'; } }
  els.hero.list.addEventListener('click', heroList)
  els.hero.save.addEventListener('click', heroSave)

  // Pages
  function pageRow(it){ const tr=document.createElement('tr'); tr.innerHTML=`<td>${it.id||''}</td><td>${it.slug||''}</td><td>${it.title||''}</td><td>${it.is_published?'Yes':'No'}</td><td>${it.published_at||''}</td>`; return tr }
  async function pagesList(){ els.pages.msg.textContent=''; els.pages.table.innerHTML=''; try { const r=await fetch(withToken('/api/admin-pages.php'), { headers: authHeaders() }); const d=await r.json(); if(!r.ok||d.success===false){ els.pages.msg.textContent='Error'; return; } (d.items||[]).forEach(it=> els.pages.table.appendChild(pageRow(it))) } catch(_) { els.pages.msg.textContent='Error'; } }
  async function pageSave(){ els.pages.msg.textContent=''; const body={ slug:els.pages.slug.value.trim(), title:els.pages.title.value.trim(), meta_title:els.pages.metaTitle.value, meta_description:els.pages.metaDesc.value, content_html:els.pages.html.value, is_published:(els.pages.published.value==='true'), published_at:els.pages.publishAt.value.trim()||null }; if(!body.slug||!body.title){ els.pages.msg.textContent='Slug and title required'; return; } try{ const r=await fetch(withToken('/api/admin-pages.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const d=await r.json(); if(!r.ok||d.success===false){ els.pages.msg.textContent='Save error'; return; } els.pages.msg.textContent='Saved.'; pagesList(); }catch(_){ els.pages.msg.textContent='Error'; }
  }
  els.pages.list.addEventListener('click', pagesList)
  els.pages.save.addEventListener('click', pageSave)

  // Offers
  function offerRow(it){ const tr=document.createElement('tr'); tr.innerHTML = `<td>${it.id||''}</td><td>${it.code||''}</td><td>${it.discount_type||''}</td><td>${it.amount??it.discount_value??''}</td><td>${it.is_active?'Yes':'No'}</td><td><button data-id="${it.id||''}" class="btn-delete">Delete</button></td>`; tr.querySelector('.btn-delete')?.addEventListener('click', ()=> offerDelete(it.id)); return tr }
  async function offersList(){ els.offers.msg.textContent=''; els.offers.table.innerHTML=''; try { const r=await fetch(withToken('/api/admin-offers.php'), { headers: authHeaders() }); const d=await r.json(); if(!r.ok||d.success===false){ els.offers.msg.textContent='Error'; return; } (d.items||[]).forEach(it=> els.offers.table.appendChild(offerRow(it))) } catch(_) { els.offers.msg.textContent='Error'; } }
  async function offerSave(){ els.offers.msg.textContent=''; const body={ code:els.offers.code.value.trim(), discount_type:els.offers.type.value, amount:Number(els.offers.amount.value||0), is_active:(els.offers.active.value==='true'), valid_from:els.offers.from.value.trim()||null, valid_to:els.offers.to.value.trim()||null }; if(!body.code){ els.offers.msg.textContent='Code required'; return; } try { const r=await fetch(withToken('/api/admin-offers.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const d=await r.json(); if(!r.ok||d.success===false){ els.offers.msg.textContent='Save error'; return; } els.offers.msg.textContent='Saved.'; offersList(); } catch(_) { els.offers.msg.textContent='Error'; } }
  async function offerDelete(id){ if(!id) return; try { await fetch(withToken('/api/admin-offers.php?id='+encodeURIComponent(id)), { method:'DELETE', headers: authHeaders() }); offersList(); } catch(_){} }
  els.offers.list.addEventListener('click', offersList)
  els.offers.save.addEventListener('click', offerSave)

  // Routes
  function routeRow(it){ const tr=document.createElement('tr'); tr.innerHTML=`<td>${it.id||''}</td><td>${it.origin||''}</td><td>${it.destination||''}</td><td>${it.distance_km??''}</td><td>${it.duration_hours??''}</td><td><button class='btn secondary btn-sm' data-id='${it.id||''}'>Delete</button></td>`; tr.querySelector('button')?.addEventListener('click',()=>routeDelete(it.id)); return tr }
  async function routesList(){ els.routes.msg.textContent=''; els.routes.table.innerHTML=''; try { const r=await fetch(withToken('/api/admin-routes.php'), { headers: authHeaders() }); const d=await r.json(); if(!r.ok||d.success===false){ els.routes.msg.textContent='Error'; return; } (d.items||[]).forEach(it=> els.routes.table.appendChild(routeRow(it))); } catch(_){ els.routes.msg.textContent='Error'; } }
  async function routeCreate(){ els.routes.msg.textContent=''; const body={ origin:els.routes.origin.value.trim(), destination:els.routes.destination.value.trim(), distance_km:Number(els.routes.distance.value||0), duration_hours:Number(els.routes.duration.value||0) }; if(!body.origin||!body.destination){ els.routes.msg.textContent='Origin and destination required'; return; } try { const r=await fetch(withToken('/api/admin-routes.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const d=await r.json(); if(!r.ok||d.success===false){ els.routes.msg.textContent='Create failed'; return; } els.routes.msg.textContent='Created.'; routesList(); } catch(_){ els.routes.msg.textContent='Error'; } }
  async function routeDelete(id){ if(!id) return; if(!confirm('Delete this route?')) return; try { await fetch(withToken('/api/admin-routes.php?id='+encodeURIComponent(id)), { method:'DELETE', headers: authHeaders() }); routesList(); } catch(_){} }
  els.routes.load?.addEventListener('click', routesList)
  els.routes.create?.addEventListener('click', routeCreate)

  // Schedules
  function scheduleRow(it){ const tr=document.createElement('tr'); tr.innerHTML=`<td>${it.id||''}</td><td>${it.route_id||''}</td><td>${it.bus_id||''}</td><td>${it.departure_time||''}</td><td>${it.arrival_time||''}</td><td>${it.base_price??''}</td><td>${it.is_active?'Yes':'No'}</td><td><button class='btn secondary btn-sm' data-id='${it.id||''}'>Delete</button></td>`; tr.querySelector('button')?.addEventListener('click',()=>scheduleDelete(it.id)); return tr }
  async function schedulesList(){ els.schedules.msg.textContent=''; els.schedules.table.innerHTML=''; const q=[]; if(els.schedules.route.value.trim()) q.push('route_id='+encodeURIComponent(els.schedules.route.value.trim())); if(els.schedules.bus.value.trim()) q.push('bus_id='+encodeURIComponent(els.schedules.bus.value.trim())); try { const r=await fetch(withToken('/api/admin-schedules.php'+(q.length?('?'+q.join('&')):'')), { headers: authHeaders() }); const d=await r.json(); if(!r.ok||d.success===false){ els.schedules.msg.textContent='Error'; return; } (d.items||[]).forEach(it=> els.schedules.table.appendChild(scheduleRow(it))); } catch(_){ els.schedules.msg.textContent='Error'; } }
  function toISOFromLocalInput(el){ const v=(el?.value||'').trim(); if(!v) return ''; const d=new Date(v); return isNaN(d)? v : d.toISOString(); }
  async function scheduleCreate(){ const body={ route_id:els.schedules.route.value.trim(), bus_id:els.schedules.bus.value.trim(), departure_time:toISOFromLocalInput(els.schedules.dep), arrival_time:toISOFromLocalInput(els.schedules.arr), base_price:Number(els.schedules.price.value||0), is_active:(els.schedules.active.value==='true') }; if(!body.route_id||!body.bus_id){ els.schedules.msg.textContent='Pick route and bus using search'; return; } try { const r=await fetch(withToken('/api/admin-schedules.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const d=await r.json(); if(!r.ok||d.success===false){ els.schedules.msg.textContent='Create failed'; return; } els.schedules.msg.textContent='Created.'; schedulesList(); } catch(_){ els.schedules.msg.textContent='Error'; } }
  async function scheduleDelete(id){ if(!id) return; if(!confirm('Delete this schedule?')) return; try { await fetch(withToken('/api/admin-schedules.php?id='+encodeURIComponent(id)), { method:'DELETE', headers: authHeaders() }); schedulesList(); } catch(_){} }
  els.schedules.load?.addEventListener('click', schedulesList)
  els.schedules.create?.addEventListener('click', scheduleCreate)
  // Typeahead
  els.schedules.routeSearch?.addEventListener('input', async ()=>{ const q=(els.schedules.routeSearch.value||'').trim(); if(q.length<1) return; const parts=q.split('→').map(t=>t.trim()); const qs=[]; if(parts[0]) qs.push('origin='+encodeURIComponent(parts[0])); if(parts[1]) qs.push('destination='+encodeURIComponent(parts[1])); const r=await fetch(withToken('/api/admin-routes.php'+(qs.length?('?'+qs.join('&')):'')), { headers: authHeaders() }); const d=await r.json().catch(()=>({})); els.schedules.routesListEl.innerHTML=''; (d.items||[]).forEach(it=>{ const opt=document.createElement('option'); opt.value=`${it.origin} → ${it.destination}`; opt.dataset.id=it.id; els.schedules.routesListEl.appendChild(opt); }); })
  els.schedules.routeSearch?.addEventListener('change', ()=>{ const val=els.schedules.routeSearch.value; const opt=[...els.schedules.routesListEl.options].find(o=>o.value===val); els.schedules.route.value = opt?.dataset?.id || ''; })
  els.schedules.busSearch?.addEventListener('input', async ()=>{ const r=await fetch(withToken('/api/admin-buses.php'), { headers: authHeaders() }); const d=await r.json().catch(()=>({})); const q=(els.schedules.busSearch.value||'').toLowerCase(); els.schedules.busesListEl.innerHTML=''; (d.items||[]).filter(it=>{ const label=(it.bus_type||'')+','+(it.total_seats||''); return label.toLowerCase().includes(q); }).forEach(it=>{ const opt=document.createElement('option'); opt.value=`${it.bus_type} (${it.total_seats})`; opt.dataset.id=it.id; els.schedules.busesListEl.appendChild(opt); }); })
  els.schedules.busSearch?.addEventListener('change', ()=>{ const val=els.schedules.busSearch.value; const opt=[...els.schedules.busesListEl.options].find(o=>o.value===val); els.schedules.bus.value = opt?.dataset?.id || ''; })

  // Payments
  function paymentRow(it){ const tr=document.createElement('tr'); tr.innerHTML = `<td>${it.id||''}</td><td>${it.booking_id||''}</td><td>${it.amount??''}</td><td>${it.payment_method||''}</td><td>${it.transaction_id||''}</td><td>${it.payment_status||''}</td><td>${it.created_at||''}</td>`; return tr }
  async function paymentsList(){ els.payments.table.innerHTML=''; const q=[]; if(els.payments.status?.value?.trim()) q.push('status='+encodeURIComponent(els.payments.status.value.trim())); if(els.payments.tx?.value?.trim()) q.push('transaction_id='+encodeURIComponent(els.payments.tx.value.trim())); const r = await fetch(withToken('/api/admin-payments.php'+(q.length?('?'+q.join('&')):'')), { headers: authHeaders() }); const d=await r.json(); if(!r.ok||d.success===false){ return; } (d.items||[]).forEach(it=> els.payments.table.appendChild(paymentRow(it))); }
  els.payments.load?.addEventListener('click', paymentsList)

  // Default actions
  if(getToken()){ els.login.status.textContent='Logged in' }
  siteLoad();
})();
