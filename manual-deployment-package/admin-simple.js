(function(){
  // Helpers
  function $(id){ return document.getElementById(id) }
  function sanitizeToken(s){ try{ s=s.normalize('NFKC') }catch(_){} return (s||'').replace(/[^\x20-\x7E]/g,'').trim() }
  function getToken(){ return localStorage.getItem('admin_token') || '' }
  function setToken(v){ localStorage.setItem('admin_token', sanitizeToken(v||'')) }
  function authHeaders(){ const t=sanitizeToken(getToken()); const h={'Content-Type':'application/json'}; if(t) h['X-Admin-Token']=t; return h }
  function withToken(url){ const t=sanitizeToken(getToken()); if(!t) return url; return url + (url.includes('?')?'&':'?') + 'admin_token=' + encodeURIComponent(t) }
  function row(html){ const tr=document.createElement('tr'); tr.innerHTML=html; return tr }

  // Navigation
  const views = ['dashboard','pages','routes','schedules','hero','site','offers']
  const navButtons = Array.from(document.querySelectorAll('nav button'))
  function show(view){ views.forEach(v=>{ const el=$('view-'+v); if(el) el.classList.toggle('hidden', v!==view) }); navButtons.forEach(b=> b.classList.toggle('active', b.dataset.view===view)); if(view==='dashboard') refreshKPI() }
  navButtons.forEach(b=> b.addEventListener('click', ()=> show(b.dataset.view)))

  // Login / Token
  const ls = $('loginStatus')
  $('loginBtn')?.addEventListener('click', async ()=>{
    ls.textContent='Logging in...'
    try{
      const username=$('login-username').value.trim()
      const password=$('login-password').value
      if(password){ setToken(password); const secure=(location.protocol==='https:')?'; Secure':''; document.cookie='x_admin_token='+encodeURIComponent(password)+'; Path=/; Max-Age='+(24*60*60)+'; SameSite=Lax'+secure }
      const res = await fetch('/api/admin-login.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) })
      const data = await res.json().catch(()=>({}))
      if(!res.ok || data.success===false) throw new Error(data.error||'Login failed')
      ls.textContent='Logged in'
      refreshKPI()
    }catch(e){ ls.textContent='Login error' }
  })
  $('saveToken')?.addEventListener('click', ()=>{
    const t=sanitizeToken($('admin-token-input')?.value||''); setToken(t); const secure=(location.protocol==='https:')?'; Secure':''; if(t) document.cookie='x_admin_token='+encodeURIComponent(t)+'; Path=/; Max-Age='+(30*24*60*60)+'; SameSite=Lax'+secure; ls.textContent=t?'Token saved':'Logged out'
  })
  // Silent auth check
  fetch(withToken('/api/admin-token-check.php'), { headers: authHeaders(), credentials:'same-origin' }).then(()=>{ ls.textContent='Ready' }).catch(()=>{})

  // KPI
  async function refreshKPI(){ try{ const res=await fetch(withToken('/api/admin-kpi.php'), { headers: authHeaders() }); const d=await res.json(); if(res.ok){ const k=d.kpi||{}; $('kpi-revenue').textContent='₹'+Number(k.revenue||0).toLocaleString('en-IN'); $('kpi-bookings').textContent=Number(k.bookings||0); $('kpi-routes').textContent=Number(k.routes||0); $('kpi-buses').textContent=Number(k.buses||0); $('kpi-schedules').textContent=Number(k.schedules||0); $('kpi-offers').textContent=Number(k.offers||0) } }catch(_){}}
  $('kpi-refresh')?.addEventListener('click', refreshKPI)

  // Pages
  async function pagesList(){ const tb=document.querySelector('#pg-table tbody'); if(!tb) return; tb.innerHTML=''; try{ const res=await fetch(withToken('/api/admin-pages.php'), { headers: authHeaders() }); const data=await res.json(); (data.items||[]).forEach(it=> tb.appendChild(row(`<td>${it.id||''}</td><td>${it.slug||''}</td><td>${it.title||''}</td><td>${it.is_published?'Yes':'No'}</td><td>${it.published_at||''}</td>`))) }catch(_){}}
  async function pageSave(){ const body={ slug:$('pg-slug').value.trim(), title:$('pg-title').value.trim(), meta_title:$('pg-meta-title').value, meta_description:$('pg-meta-desc').value, content_html:$('pg-html').value, is_published:($('pg-published').value==='true'), published_at:$('pg-publish-at').value.trim()||null }; $('pg-msg').textContent='Saving...'; const res=await fetch(withToken('/api/admin-pages.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json().catch(()=>({})); $('pg-msg').textContent=res.ok&&data.success!==false?'Saved.':'Save failed' ; if(res.ok) pagesList() }
  $('pg-list')?.addEventListener('click', pagesList); $('pg-save')?.addEventListener('click', pageSave)

  // Hero
  async function heroList(){ const tb=document.querySelector('#hr-table tbody'); if(!tb) return; tb.innerHTML=''; try{ const res=await fetch(withToken('/api/admin-hero.php'), { headers: authHeaders() }); const data=await res.json(); (data.items||[]).forEach(it=> tb.appendChild(row(`<td>${it.id||''}</td><td>${it.title||''}</td><td>${it.is_active?'Yes':'No'}</td><td>${it.start_at||''}</td><td>${it.end_at||''}</td>`))) }catch(_){}}
  async function heroSave(){ const body={ title:$('hr-title').value.trim(), subtitle:$('hr-subtitle').value.trim(), cta_text:$('hr-cta-text').value.trim(), cta_href:$('hr-cta-href').value.trim(), background_url:$('hr-bg').value.trim(), is_active:($('hr-active').value==='true'), start_at:$('hr-start').value.trim()||null, end_at:$('hr-end').value.trim()||null }; $('hr-msg').textContent='Saving...'; const res=await fetch(withToken('/api/admin-hero.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json().catch(()=>({})); $('hr-msg').textContent=res.ok&&data.success!==false?'Saved.':'Save error'; if(res.ok) heroList() }
  $('hr-list')?.addEventListener('click', heroList); $('hr-save')?.addEventListener('click', heroSave)

  // Site settings
  async function siteLoad(){ $('site-msg').textContent='Loading...'; try{ const res=await fetch(withToken('/api/admin-site.php'), { headers: authHeaders() }); const data=await res.json(); if(res.ok){ const it=data.item||{}; $('site-seo-title').value=it.seo_title||''; $('site-seo-desc').value=it.seo_description||''; $('site-phone').value=it.phone||''; $('site-email').value=it.email||''; $('site-whatsapp').value=it.support_whatsapp||''; $('site-og').value=it.og_image||''; $('site-footer').value=it.footer_html||''; $('site-msg').textContent='Loaded.' } else { $('site-msg').textContent='Load error' } }catch(_){ $('site-msg').textContent='Load error' } }
  async function siteSave(){ $('site-msg').textContent='Saving...'; const body={ seo_title:$('site-seo-title').value, seo_description:$('site-seo-desc').value, phone:$('site-phone').value, email:$('site-email').value, support_whatsapp:$('site-whatsapp').value, og_image:$('site-og').value, footer_html:$('site-footer').value }; const res=await fetch(withToken('/api/admin-site.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json().catch(()=>({})); $('site-msg').textContent=res.ok&&data.success!==false?'Saved.':'Save error' }
  $('site-load')?.addEventListener('click', siteLoad); $('site-save')?.addEventListener('click', siteSave)

  // Routes
  const r = { origin: $('r-origin'), destination: $('r-destination'), distance: $('r-distance'), duration: $('r-duration'), msg: $('r-msg') }
  let rEditId = null
  async function routesList(){ const tb=document.querySelector('#r-table tbody'); if(!tb) return; tb.innerHTML=''; r.msg.textContent=''; try{ const res=await fetch(withToken('/api/admin-routes.php'), { headers: authHeaders() }); const data=await res.json(); (data.items||[]).forEach(it=>{ const tr=row(`<td>${it.id||''}</td><td>${it.origin||''}</td><td>${it.destination||''}</td><td>${it.distance_km??''}</td><td>${it.duration_hours??''}</td><td><button data-a='edit'>Edit</button> <button data-a='del'>Delete</button></td>`); tr.querySelector('[data-a="edit"]').addEventListener('click',()=>{ r.origin.value=it.origin||''; r.destination.value=it.destination||''; r.distance.value=it.distance_km??''; r.duration.value=it.duration_hours??''; rEditId=it.id||null; $('r-save').textContent=rEditId?'Save':'Create' }); tr.querySelector('[data-a="del"]').addEventListener('click', async ()=>{ if(!it.id) return; if(!confirm('Delete this route?')) return; await fetch(withToken('/api/admin-routes.php?id='+encodeURIComponent(it.id)), { method:'DELETE', headers: authHeaders() }); routesList() }); tb.appendChild(tr) }) }catch(_){ r.msg.textContent='Load error' } }
  async function routeSave(){ const body={ origin:r.origin.value.trim(), destination:r.destination.value.trim(), distance_km:Number(r.distance.value||0), duration_hours:Number(r.duration.value||0) }; if(rEditId){ body.id=rEditId; } r.msg.textContent='Saving...'; const res=await fetch(withToken('/api/admin-routes.php'), { method: rEditId?'PATCH':'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json().catch(()=>({})); r.msg.textContent=res.ok&&data.success!==false?(rEditId?'Updated.':'Created.'):'Save failed'; if(res.ok){ rEditId=null; $('r-save').textContent='Save'; routesList() } }
  $('r-list')?.addEventListener('click', routesList); $('r-save')?.addEventListener('click', routeSave)

  // Schedules
  const s = { route: $('s-route'), bus: $('s-bus'), dep: $('s-dep'), arr: $('s-arr'), price: $('s-price'), active: $('s-active'), msg: $('s-msg') }
  function toISO(el){ const v=(el?.value||'').trim(); if(!v) return ''; const d=new Date(v); return isNaN(d)? v: d.toISOString() }
  async function schedulesList(){ const tb=document.querySelector('#s-table tbody'); if(!tb) return; tb.innerHTML=''; s.msg.textContent=''; try{ const qs=[]; if(s.route.value.trim()) qs.push('route_id='+encodeURIComponent(s.route.value.trim())); if(s.bus.value.trim()) qs.push('bus_id='+encodeURIComponent(s.bus.value.trim())); const res=await fetch(withToken('/api/admin-schedules.php'+(qs.length?('?'+qs.join('&')):'')), { headers: authHeaders() }); const data=await res.json(); (data.items||[]).forEach(it=>{ const tr=row(`<td>${it.id||''}</td><td>${it.route_id||''}</td><td>${it.bus_id||''}</td><td>${it.departure_time||''}</td><td>${it.arrival_time||''}</td><td>${it.base_price??''}</td><td>${it.is_active?'Yes':'No'}</td><td><button data-id='${it.id||''}'>Delete</button></td>`); tr.querySelector('button')?.addEventListener('click', async ()=>{ if(!it.id) return; if(!confirm('Delete this schedule?')) return; await fetch(withToken('/api/admin-schedules.php?id='+encodeURIComponent(it.id)), { method:'DELETE', headers: authHeaders() }); schedulesList() }); tb.appendChild(tr) }) }catch(_){ s.msg.textContent='Load error' } }
  async function scheduleSave(){ const body={ route_id:s.route.value.trim(), bus_id:s.bus.value.trim(), departure_time:toISO(s.dep), arrival_time:toISO(s.arr), base_price:Number(s.price.value||0), is_active:(s.active.value==='true') }; if(!body.route_id||!body.bus_id){ s.msg.textContent='Pick route and bus using search'; return; } s.msg.textContent='Saving...'; const res=await fetch(withToken('/api/admin-schedules.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json().catch(()=>({})); s.msg.textContent=res.ok&&data.success!==false?'Created.':'Create failed'; if(res.ok) schedulesList() }
  $('s-list')?.addEventListener('click', schedulesList); $('s-save')?.addEventListener('click', scheduleSave)
  // Typeahead: routes
  const routesListEl = document.getElementById('routes-datalist'); const routeSearch = document.getElementById('s-route-search')
  routeSearch?.addEventListener('input', async ()=>{ const q=(routeSearch.value||'').trim(); if(q.length<1) return; const parts=q.split('→').map(t=>t.trim()); const qs=[]; if(parts[0]) qs.push('origin='+encodeURIComponent(parts[0])); if(parts[1]) qs.push('destination='+encodeURIComponent(parts[1])); const res=await fetch(withToken('/api/admin-routes.php'+(qs.length?('?'+qs.join('&')):'')), { headers: authHeaders() }); const data=await res.json().catch(()=>({})); routesListEl.innerHTML=''; (data.items||[]).forEach(it=>{ const opt=document.createElement('option'); opt.value=`${it.origin} → ${it.destination}`; opt.dataset.id=it.id; routesListEl.appendChild(opt) }) })
  routeSearch?.addEventListener('change', ()=>{ const val=routeSearch.value; const opt=[...routesListEl.options].find(o=>o.value===val); s.route.value=opt?.dataset?.id||'' })
  // Typeahead: buses
  const busesListEl = document.getElementById('buses-datalist'); const busSearch = document.getElementById('s-bus-search')
  busSearch?.addEventListener('input', async ()=>{ const res=await fetch(withToken('/api/admin-buses.php'), { headers: authHeaders() }); const data=await res.json().catch(()=>({})); const q=(busSearch.value||'').toLowerCase(); busesListEl.innerHTML=''; (data.items||[]).filter(it=>{ const label=(it.bus_type||'')+','+(it.total_seats||''); return label.toLowerCase().includes(q) }).forEach(it=>{ const opt=document.createElement('option'); opt.value=`${it.bus_type} (${it.total_seats})`; opt.dataset.id=it.id; busesListEl.appendChild(opt) }) })
  busSearch?.addEventListener('change', ()=>{ const val=busSearch.value; const opt=[...busesListEl.options].find(o=>o.value===val); s.bus.value=opt?.dataset?.id||'' })

  // Offers
  async function offersList(){ const tb=document.querySelector('#o-table tbody'); if(!tb) return; tb.innerHTML=''; try{ const res=await fetch(withToken('/api/admin-offers.php'), { headers: authHeaders() }); const data=await res.json(); (data.items||[]).forEach(it=> tb.appendChild(row(`<td>${it.id||''}</td><td>${it.code||''}</td><td>${it.discount_type||''}</td><td>${it.amount??''}</td><td>${it.is_active?'Yes':'No'}</td>`))) }catch(_){}}
  async function offerSave(){ const body={ code:$('o-code').value.trim(), discount_type:$('o-type').value, amount:Number($('o-amount').value||0), is_active:($('o-active').value==='true'), valid_from:$('o-from').value.trim()||null, valid_to:$('o-to').value.trim()||null }; $('o-msg').textContent='Saving...'; const res=await fetch(withToken('/api/admin-offers.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json().catch(()=>({})); $('o-msg').textContent=res.ok&&data.success!==false?'Created.':'Create failed'; if(res.ok) offersList() }
  $('o-list')?.addEventListener('click', offersList); $('o-save')?.addEventListener('click', offerSave)

  // Keyboard shortcut: Ctrl+S
  document.addEventListener('keydown', (e)=>{
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){
      e.preventDefault();
      const current = views.find(v=> !($('view-'+v)?.classList.contains('hidden')))
      if(current==='pages') $('pg-save')?.click();
      if(current==='routes') $('r-save')?.click();
      if(current==='schedules') $('s-save')?.click();
      if(current==='hero') $('hr-save')?.click();
      if(current==='site') $('site-save')?.click();
      if(current==='offers') $('o-save')?.click();
    }
  })

  // Initial
  show('dashboard');
  refreshKPI();
})();
