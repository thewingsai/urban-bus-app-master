(function(){
  // Shared helpers
  const els = {
    navButtons: Array.from(document.querySelectorAll('.nav button')),
    views: {
      routes: document.getElementById('view-routes'),
      buses: document.getElementById('view-buses'),
      schedules: document.getElementById('view-schedules'),
      pricing: document.getElementById('view-pricing'),
      offers: document.getElementById('view-offers'),
    }
  };
  function sanitizeToken(s){ try { s = s.normalize('NFKC'); } catch(_){} return (s||'').replace(/[^\x20-\x7E]/g,'').trim(); }
  function getToken(){ return localStorage.getItem('admin_token') || ''; }
  function setToken(v){ localStorage.setItem('admin_token', sanitizeToken(v||'')); }
  function authHeaders(){ const t=sanitizeToken(getToken()); const h={ 'Content-Type': 'application/json' }; if(t) h['X-Admin-Token']=t; return h; }
  function withToken(url){ const t=sanitizeToken(getToken()); if(!t) return url; return url + (url.includes('?') ? '&' : '?') + 'admin_token=' + encodeURIComponent(t); }

  // Navigation
  function show(view){ for (const [k,el] of Object.entries(els.views)) { el.classList.toggle('hidden', k!==view); } els.navButtons.forEach(b=>b.classList.toggle('active', b.dataset.view===view)); if(view==='dashboard'){ kpiRefresh(); } }
  els.navButtons.forEach(b=> b.addEventListener('click', ()=> show(b.dataset.view)) );

  // Login
  const lu = document.getElementById('login-username');
  const lp = document.getElementById('login-password');
  const lb = document.getElementById('loginBtn');
  const ls = document.getElementById('loginStatus');
  const tokenInput = document.getElementById('admin-token-input');
  const saveTokenBtn = document.getElementById('saveToken');
  async function login(){
    ls.textContent = 'Logging in...';
    try {
      const pwd = lp.value || '';
      // Persist token for header/query auth and set cookie (omit Secure on http for local dev)
      if (pwd) {
        setToken(pwd);
        const secureAttr = (location.protocol === 'https:') ? '; Secure' : '';
        document.cookie = 'x_admin_token=' + encodeURIComponent(pwd) + '; Path=/; Max-Age=' + (24*60*60) + '; SameSite=Lax' + secureAttr;
      }
      const res = await fetch('/api/admin-login.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: lu.value.trim(), password: pwd }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.success === false) throw new Error(data.error||'Login failed');
      ls.textContent = 'Logged in';
    } catch(e){ ls.textContent = 'Login error'; }
  }
  lb.addEventListener('click', login);
  // Token manual save
  if (saveTokenBtn) {
    saveTokenBtn.addEventListener('click', ()=>{
      const t = sanitizeToken(tokenInput?.value||'');
      setToken(t);
      const secureAttr = (location.protocol === 'https:') ? '; Secure' : '';
      if (t) document.cookie = 'x_admin_token=' + encodeURIComponent(t) + '; Path=/; Max-Age=' + (30*24*60*60) + '; SameSite=Lax' + secureAttr;
      ls.textContent = t ? 'Token saved' : 'Logged out';
    });
  }
  // Attempt silent session check by calling a protected endpoint (optional)
  fetch(withToken('/api/admin-routes.php'), { headers: authHeaders(), credentials:'same-origin' }).then(()=>{ ls.textContent='Logged in'; }).catch(()=>{});

  // Routes
  const r = {
    origin: document.getElementById('r-origin'),
    destination: document.getElementById('r-destination'),
    distance: document.getElementById('r-distance'),
    duration: document.getElementById('r-duration'),
    create: document.getElementById('r-create'),
    load: document.getElementById('r-load'),
    msg: document.getElementById('r-msg'),
    table: document.querySelector('#r-table tbody')
  };
  async function routesList(){
    r.msg.textContent=''; r.table.innerHTML='';
    const fo = (document.getElementById('r-filter-origin')?.value||'').trim();
    const fd = (document.getElementById('r-filter-destination')?.value||'').trim();
    const qs=[]; if(fo) qs.push('origin='+encodeURIComponent(fo)); if(fd) qs.push('destination='+encodeURIComponent(fd));
    const url = withToken('/api/admin-routes.php'+(qs.length?('?'+qs.join('&')):''));
    const res = await fetch(url, { headers: authHeaders() });
    const data = await res.json(); if(!res.ok||data.success===false){ r.msg.textContent = 'Error loading routes'; return; }
    (data.items||[]).forEach(item=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${item.id||''}</td><td>${item.origin||''}</td><td>${item.destination||''}</td><td>${item.distance_km??''}</td><td>${item.duration_hours??''}</td><td><button class='btn btn-sm' data-action='edit'>Edit</button> <button class='btn secondary btn-sm' data-action='delete'>Delete</button></td>`;
      tr.querySelector('[data-action="edit"]')?.addEventListener('click',()=>routeEditFill(item));
      tr.querySelector('[data-action="delete"]')?.addEventListener('click',()=>routeDelete(item.id));
      r.table.appendChild(tr);
    });
  }
  async function routeCreate(){
    r.msg.textContent='';
    const body = { origin:r.origin.value.trim(), destination:r.destination.value.trim(), distance_km:Number(r.distance.value||0), duration_hours:Number(r.duration.value||0) };
    const res = await fetch(withToken('/api/admin-routes.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const data = await res.json(); if(!res.ok||data.success===false){ r.msg.textContent = 'Create failed'; return; }
    r.msg.textContent='Created.'; routesList();
  }
  async function routeDelete(id){ if(!id) return; if(!confirm('Delete this route?')) return; await fetch(withToken('/api/admin-routes.php?id='+encodeURIComponent(id)), { method:'DELETE', headers: authHeaders() }); routesList(); }
  let rEditId = null;
  function routeEditFill(item){ r.origin.value=item.origin||''; r.destination.value=item.destination||''; r.distance.value=item.distance_km??''; r.duration.value=item.duration_hours??''; rEditId=item.id||null; document.getElementById('r-create').textContent = rEditId? 'Save':'Create'; }
  async function routeSave(){ if(rEditId){ const body={ id:rEditId, origin:r.origin.value.trim(), destination:r.destination.value.trim(), distance_km:Number(r.distance.value||0), duration_hours:Number(r.duration.value||0) }; const res=await fetch(withToken('/api/admin-routes.php'), { method:'PATCH', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json(); if(!res.ok||data.success===false){ r.msg.textContent='Update failed'; return; } r.msg.textContent='Updated.'; rEditId=null; document.getElementById('r-create').textContent='Create'; routesList(); } else { await routeCreate(); } }
  r.create.addEventListener('click', routeSave); r.load.addEventListener('click', routesList);
  document.getElementById('r-filter')?.addEventListener('click', routesList);
  document.getElementById('r-filter-origin')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') routesList(); });
  document.getElementById('r-filter-destination')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') routesList(); });
  document.getElementById('r-export')?.addEventListener('click', async ()=>{
    const fo=(document.getElementById('r-filter-origin')?.value||'').trim();
    const fd=(document.getElementById('r-filter-destination')?.value||'').trim();
    const qs=[]; if(fo) qs.push('origin='+encodeURIComponent(fo)); if(fd) qs.push('destination='+encodeURIComponent(fd));
    const url = withToken('/api/admin-routes.php'+(qs.length?('?'+qs.join('&')):''));
    const res = await fetch(url, { headers: authHeaders() }); const data=await res.json(); const rows=(data.items||[]);
    const csv=['id,origin,destination,distance_km,duration_hours'];
    rows.forEach(it=>csv.push([it.id,it.origin,it.destination,it.distance_km,it.duration_hours].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')));
    const blob=new Blob([csv.join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='routes.csv'; a.click(); URL.revokeObjectURL(a.href);
  });

  // Buses
  const b = { type:document.getElementById('b-type'), seats:document.getElementById('b-seats'), amenities:document.getElementById('b-amenities'), create:document.getElementById('b-create'), load:document.getElementById('b-load'), msg:document.getElementById('b-msg'), table:document.querySelector('#b-table tbody') };
  async function busesList(){ b.msg.textContent=''; b.table.innerHTML=''; const res = await fetch(withToken('/api/admin-buses.php'), { headers: authHeaders() }); const data = await res.json(); if(!res.ok||data.success===false){ b.msg.textContent='Error'; return; } (data.items||[]).forEach(item=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.id||''}</td><td>${item.bus_type||''}</td><td>${item.total_seats??''}</td><td>${(item.amenities||[]).join(', ')}</td><td><button class='btn btn-sm' data-action='edit'>Edit</button> <button class='btn secondary btn-sm' data-action='delete'>Delete</button></td>`; tr.querySelector('[data-action="edit"]')?.addEventListener('click',()=>busEditFill(item)); tr.querySelector('[data-action="delete"]')?.addEventListener('click',()=>busDelete(item.id)); b.table.appendChild(tr); }); }
  async function busCreate(){ const body={ bus_type:b.type.value.trim(), total_seats:Number(b.seats.value||0), amenities:(b.amenities.value||'').split(',').map(s=>s.trim()).filter(Boolean) }; const res = await fetch(withToken('/api/admin-buses.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data = await res.json(); if(!res.ok||data.success===false){ b.msg.textContent='Create failed'; return; } b.msg.textContent='Created.'; busesList(); }
  async function busDelete(id){ if(!id) return; if(!confirm('Delete this bus?')) return; await fetch(withToken('/api/admin-buses.php?id='+encodeURIComponent(id)), { method:'DELETE', headers: authHeaders() }); busesList(); }
  let bEditId=null; function busEditFill(item){ b.type.value=item.bus_type||''; b.seats.value=item.total_seats??''; b.amenities.value=(item.amenities||[]).join(', '); bEditId=item.id||null; document.getElementById('b-create').textContent = bEditId? 'Save':'Create'; }
  async function busSave(){ if(bEditId){ const body={ id:bEditId, bus_type:b.type.value.trim(), total_seats:Number(b.seats.value||0), amenities:(b.amenities.value||'').split(',').map(s=>s.trim()).filter(Boolean) }; const res=await fetch(withToken('/api/admin-buses.php'), { method:'PATCH', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json(); if(!res.ok||data.success===false){ b.msg.textContent='Update failed'; return; } b.msg.textContent='Updated.'; bEditId=null; document.getElementById('b-create').textContent='Create'; busesList(); } else { await busCreate(); } }
  b.create.addEventListener('click', busSave); b.load.addEventListener('click', busesList);

  // Schedules
  const s = { route:document.getElementById('s-route'), bus:document.getElementById('s-bus'), dep:document.getElementById('s-dep'), arr:document.getElementById('s-arr'), price:document.getElementById('s-price'), active:document.getElementById('s-active'), create:document.getElementById('s-create'), load:document.getElementById('s-load'), msg:document.getElementById('s-msg'), table:document.querySelector('#s-table tbody'), routeSearch:document.getElementById('s-route-search'), busSearch:document.getElementById('s-bus-search'), routesListEl:document.getElementById('routes-datalist'), busesListEl:document.getElementById('buses-datalist') };
  async function schedulesList(){ s.msg.textContent=''; s.table.innerHTML=''; const q=[]; if(s.route.value.trim()) q.push('route_id='+encodeURIComponent(s.route.value.trim())); if(s.bus.value.trim()) q.push('bus_id='+encodeURIComponent(s.bus.value.trim())); const res = await fetch(withToken('/api/admin-schedules.php'+(q.length?('?'+q.join('&')):'')), { headers: authHeaders() }); const data = await res.json(); if(!res.ok||data.success===false){ s.msg.textContent='Error'; return; } (data.items||[]).forEach(item=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.id||''}</td><td>${item.route_id||''}</td><td>${item.bus_id||''}</td><td>${item.departure_time||''}</td><td>${item.arrival_time||''}</td><td>${item.base_price??''}</td><td>${item.is_active? 'Yes':'No'}</td><td><button class='btn secondary btn-sm' data-id='${item.id}'>Delete</button></td>`; tr.querySelector('button')?.addEventListener('click',()=>scheduleDelete(item.id)); s.table.appendChild(tr); }); }
  function toISOFromLocalInput(el){ const v=(el?.value||'').trim(); if(!v) return ''; const d=new Date(v); return isNaN(d)? v : d.toISOString(); }
  async function scheduleCreate(){ const body={ route_id:s.route.value.trim(), bus_id:s.bus.value.trim(), departure_time:toISOFromLocalInput(s.dep), arrival_time:toISOFromLocalInput(s.arr), base_price:Number(s.price.value||0), is_active:(s.active.value==='true') }; if(!body.route_id||!body.bus_id){ s.msg.textContent='Pick route and bus using search'; return; } const res = await fetch(withToken('/api/admin-schedules.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data = await res.json(); if(!res.ok||data.success===false){ s.msg.textContent='Create failed'; return; } s.msg.textContent='Created.'; schedulesList(); }
  async function scheduleDelete(id){ if(!id) return; if(!confirm('Delete this schedule?')) return; await fetch(withToken('/api/admin-schedules.php?id='+encodeURIComponent(id)), { method:'DELETE', headers: authHeaders() }); schedulesList(); }
  s.create.addEventListener('click', scheduleCreate); s.load.addEventListener('click', schedulesList);
  // Typeahead for route
  s.routeSearch?.addEventListener('input', async ()=>{
    const q=(s.routeSearch.value||'').trim(); if(q.length<1) return;
    const parts=q.split('→').map(t=>t.trim()); const qs=[]; if(parts[0]) qs.push('origin='+encodeURIComponent(parts[0])); if(parts[1]) qs.push('destination='+encodeURIComponent(parts[1]));
    const res = await fetch(withToken('/api/admin-routes.php'+(qs.length?('?'+qs.join('&')):'')), { headers: authHeaders() }); const data=await res.json().catch(()=>({}));
    s.routesListEl.innerHTML=''; (data.items||[]).forEach(it=>{ const opt=document.createElement('option'); opt.value=`${it.origin} → ${it.destination}`; opt.dataset.id=it.id; s.routesListEl.appendChild(opt); });
  });
  s.routeSearch?.addEventListener('change', ()=>{
    const val=s.routeSearch.value; const opt=[...s.routesListEl.options].find(o=>o.value===val); s.route.value = opt?.dataset?.id || '';
  });
  // Typeahead for bus
  s.busSearch?.addEventListener('input', async ()=>{
    const res = await fetch(withToken('/api/admin-buses.php'), { headers: authHeaders() }); const data=await res.json().catch(()=>({}));
    const q=(s.busSearch.value||'').toLowerCase(); s.busesListEl.innerHTML=''; (data.items||[]).filter(it=>{
      const label=(it.bus_type||'')+','+(it.total_seats||''); return label.toLowerCase().includes(q);
    }).forEach(it=>{ const opt=document.createElement('option'); opt.value=`${it.bus_type} (${it.total_seats})`; opt.dataset.id=it.id; s.busesListEl.appendChild(opt); });
  });
  s.busSearch?.addEventListener('change', ()=>{
    const val=s.busSearch.value; const opt=[...s.busesListEl.options].find(o=>o.value===val); s.bus.value = opt?.dataset?.id || '';
  });

  // Pricing (reuse existing logic from old admin.js minimally)
  const p = { allowed:document.getElementById('allowedFares'), active:document.getElementById('activeFare'), enabled:document.getElementById('enabled'), loadBtn:document.getElementById('loadBtn'), listAllBtn:document.getElementById('listAllBtn'), saveBtn:document.getElementById('savePricing'), origin:document.getElementById('origin'), destination:document.getElementById('destination'), msg:document.getElementById('routeMsg'), listBody:document.querySelector('#listTable tbody') };
  function parseFares(str){ return (str||'').split(',').map(s=>s.trim()).filter(Boolean).map(Number).filter(n=>Number.isFinite(n)).map(n=>Math.round(n)); }
  function renderActiveFareOptions(fares, selected){ p.active.innerHTML=''; fares.forEach(v=>{ const opt=document.createElement('option'); opt.value=String(v); opt.textContent=String(v); if(selected!=null && Number(selected)===Number(v)) opt.selected=true; p.active.appendChild(opt); }); }
  async function apiPricing(method, payload){ const headers=authHeaders(); const url = withToken('/api/admin-pricing.php' + (method==='GET' ? ('?origin=' + encodeURIComponent(p.origin.value.trim()) + '&destination=' + encodeURIComponent(p.destination.value.trim())) : '')); const res = await fetch(url, { method, headers, body: method==='GET'? null : JSON.stringify(payload) }); const data = await res.json().catch(()=>({})); if(!res.ok||data.success===false) throw new Error(data.error||'Request failed'); return data; }
  async function loadPricing(){ p.msg.textContent=''; const origin=p.origin.value.trim(), destination=p.destination.value.trim(); if(!origin||!destination){ p.msg.textContent='Enter origin and destination'; return; } try { const { pricing } = await apiPricing('GET'); if(!pricing){ p.allowed.value='999,1199,1399,1499,1799'; renderActiveFareOptions(parseFares(p.allowed.value), 1499); p.enabled.checked=true; p.msg.textContent='No pricing yet. Configure and Save.'; } else { p.allowed.value=(pricing.allowed_fares||[]).join(','); renderActiveFareOptions((pricing.allowed_fares||[]), pricing.active_fare); p.enabled.checked=!!pricing.is_enabled; p.msg.textContent='Loaded.'; } } catch(e){ p.msg.textContent='Error: '+e.message; }
  async function savePricing(){ p.msg.textContent=''; const origin=p.origin.value.trim(), destination=p.destination.value.trim(); if(!origin||!destination){ p.msg.textContent='Enter origin and destination'; return; } const fares=parseFares(p.allowed.value); if(!fares.length){ p.msg.textContent='Enter at least one allowed fare'; return; } const active=Number(p.active.value||fares[0]); if(!fares.includes(active)) fares.push(active); fares.sort((a,b)=>a-b); try { const payload={ origin, destination, allowed_fares:fares, active_fare:active, is_enabled:!!p.enabled.checked }; await apiPricing('POST', payload); p.msg.textContent='Saved.'; await listAllPricing(); } catch(e){ p.msg.textContent='Error: '+e.message; } }
  async function listAllPricing(){ try { const headers=authHeaders(); const res = await fetch(withToken('/api/admin-pricing.php'), { headers }); const data=await res.json(); const tbody=p.listBody; tbody.innerHTML=''; (data.items||[]).forEach(row=>{ const r=row.routes||{}; const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.origin||''}</td><td>${r.destination||''}</td><td>${row.active_fare??''}</td><td>${row.is_enabled?'Yes':'No'}</td><td>${(row.allowed_fares||[]).join(', ')}</td><td>${row.updated_at||''}</td>`; tbody.appendChild(tr); }); } catch(e){} }
  p.loadBtn.addEventListener('click', loadPricing); p.saveBtn.addEventListener('click', savePricing); p.listAllBtn.addEventListener('click', listAllPricing);

  // Offers
  const o = { code:document.getElementById('o-code'), type:document.getElementById('o-type'), amount:document.getElementById('o-amount'), active:document.getElementById('o-active'), from:document.getElementById('o-from'), to:document.getElementById('o-to'), create:document.getElementById('o-create'), load:document.getElementById('o-load'), exportBtn:document.getElementById('o-export'), msg:document.getElementById('o-msg'), table:document.querySelector('#o-table tbody') };
  async function offersList(){ o.msg.textContent=''; o.table.innerHTML=''; const res = await fetch(withToken('/api/admin-offers.php'), { headers: authHeaders() }); const data = await res.json(); if(!res.ok||data.success===false){ o.msg.textContent='Error'; return; } (data.items||[]).forEach(item=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.id||''}</td><td>${item.code||''}</td><td>${item.discount_type||''}</td><td>${item.amount??''}</td><td>${item.is_active?'Yes':'No'}</td><td><button class='btn secondary btn-sm' data-id='${item.id}'>Delete</button></td>`; tr.querySelector('button')?.addEventListener('click',()=>offerDelete(item.id)); o.table.appendChild(tr); }); }
  async function offerCreate(){ const body={ code:o.code.value.trim(), discount_type:o.type.value, amount:Number(o.amount.value||0), is_active:(o.active.value==='true'), valid_from:o.from.value.trim()||null, valid_to:o.to.value.trim()||null }; const res = await fetch(withToken('/api/admin-offers.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data = await res.json(); if(!res.ok||data.success===false){ o.msg.textContent='Create failed'; return; } o.msg.textContent='Created.'; offersList(); }
  o.exportBtn?.addEventListener('click', async ()=>{ const res=await fetch(withToken('/api/admin-offers.php'), { headers: authHeaders() }); const data=await res.json(); const rows=(data.items||[]); const csv=['id,code,discount_type,amount,is_active,valid_from,valid_until']; rows.forEach(it=>csv.push([it.id,it.code,it.discount_type,it.amount,it.is_active,it.valid_from||'',it.valid_until||''].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))); const blob=new Blob([csv.join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='offers.csv'; a.click(); URL.revokeObjectURL(a.href); });
  async function offerDelete(id){ if(!id) return; if(!confirm('Delete this offer?')) return; await fetch(withToken('/api/admin-offers.php?id='+encodeURIComponent(id)), { method:'DELETE', headers: authHeaders() }); offersList(); }
  o.create.addEventListener('click', offerCreate); o.load.addEventListener('click', offersList);
  // CSV importers
  document.getElementById('r-import')?.addEventListener('click', async ()=>{
    const f=document.getElementById('r-import-file')?.files?.[0]; if(!f){ alert('Choose a CSV'); return; }
    const text=await f.text(); const lines=text.split(/\r?\n/).filter(Boolean); const header=lines.shift();
    for(const line of lines){ const [origin,destination,distance_km,duration_hours]=line.split(',').map(s=>s.replace(/^\"|\"$/g,'').trim()); if(!origin||!destination) continue; await fetch(withToken('/api/admin-routes.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify({ origin, destination, distance_km:Number(distance_km||0), duration_hours:Number(duration_hours||0) }) }); }
    routesList();
  });
  document.getElementById('o-import')?.addEventListener('click', async ()=>{
    const f=document.getElementById('o-import-file')?.files?.[0]; if(!f){ alert('Choose a CSV'); return; }
    const text=await f.text(); const lines=text.split(/\r?\n/).filter(Boolean); const header=lines.shift();
    for(const line of lines){ const cols=line.split(',').map(s=>s.replace(/^\"|\"$/g,'').trim()); const [code,discount_type,amount,valid_from,valid_until,is_active]=cols; if(!code) continue; await fetch(withToken('/api/admin-offers.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify({ code, discount_type, amount:Number(amount||0), valid_from:valid_from||null, valid_to:valid_until||null, is_active:String(is_active||'').toLowerCase()==='true' }) }); }
    offersList();
  });

  // Operators
  const op = { name:document.getElementById('op-name'), email:document.getElementById('op-email'), phone:document.getElementById('op-phone'), logo:document.getElementById('op-logo'), create:document.getElementById('op-create'), load:document.getElementById('op-load'), msg:document.getElementById('op-msg'), table:document.querySelector('#op-table tbody') };
  async function operatorsList(){ op.msg.textContent=''; op.table.innerHTML=''; const res = await fetch(withToken('/api/admin-operators.php'), { headers: authHeaders() }); const data = await res.json(); if(!res.ok||data.success===false){ op.msg.textContent='Error'; return; } (data.items||[]).forEach(item=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.id||''}</td><td>${item.name||''}</td><td>${item.email||''}</td><td>${item.phone||''}</td><td>${item.rating??''}</td><td>${item.total_buses??''}</td><td><button class='btn secondary btn-sm' data-id='${item.id}'>Delete</button></td>`; tr.querySelector('button')?.addEventListener('click',()=>operatorDelete(item.id)); op.table.appendChild(tr); }); }
  async function operatorCreate(){ const body={ name:op.name.value.trim(), email:op.email.value.trim(), phone:op.phone.value.trim(), logo_url:op.logo.value.trim()||null }; const res = await fetch(withToken('/api/admin-operators.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data = await res.json(); if(!res.ok||data.success===false){ op.msg.textContent='Create failed'; return; } op.msg.textContent='Created.'; operatorsList(); }
  async function operatorDelete(id){ if(!id) return; await fetch(withToken('/api/admin-operators.php?id='+encodeURIComponent(id)), { method:'DELETE', headers: authHeaders() }); operatorsList(); }
  op?.create?.addEventListener('click', operatorCreate); op?.load?.addEventListener('click', operatorsList);

  // Bookings
  const bk = { ref:document.getElementById('bk-ref'), email:document.getElementById('bk-email'), load:document.getElementById('bk-load'), msg:document.getElementById('bk-msg'), table:document.querySelector('#bk-table tbody') };
  async function bookingsList(){ bk.msg.textContent=''; bk.table.innerHTML=''; const q=[]; if(bk.ref?.value?.trim()) q.push('reference='+encodeURIComponent(bk.ref.value.trim())); if(bk.email?.value?.trim()) q.push('email='+encodeURIComponent(bk.email.value.trim())); const res = await fetch(withToken('/api/admin-bookings.php'+(q.length?('?'+q.join('&')):'')), { headers: authHeaders() }); const data = await res.json(); if(!res.ok||data.success===false){ bk.msg.textContent='Error'; return; } (data.items||[]).forEach(item=>{ const seats=Array.isArray(item.seat_numbers)?item.seat_numbers.join(', '):''; const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.booking_reference||''}</td><td>${item.passenger_name||''}</td><td>${item.passenger_email||''}</td><td>${item.travel_date||''}</td><td>${seats}</td><td>${item.total_amount??''}</td><td>${item.booking_status||''}</td><td>${item.payment_status||''}</td><td></td>`; bk.table.appendChild(tr); }); }
  bk?.load?.addEventListener('click', bookingsList);

  // Payments
  const pm = { status:document.getElementById('pm-status'), tx:document.getElementById('pm-tx'), load:document.getElementById('pm-load'), table:document.querySelector('#pm-table tbody') };
  async function paymentsList(){ pm.table.innerHTML=''; const q=[]; if(pm.status?.value?.trim()) q.push('status='+encodeURIComponent(pm.status.value.trim())); if(pm.tx?.value?.trim()) q.push('transaction_id='+encodeURIComponent(pm.tx.value.trim())); const res = await fetch(withToken('/api/admin-payments.php'+(q.length?('?'+q.join('&')):'')), { headers: authHeaders() }); const data=await res.json(); if(!res.ok||data.success===false){ return; } (data.items||[]).forEach(item=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.id||''}</td><td>${item.booking_id||''}</td><td>${item.amount??''}</td><td>${item.payment_method||''}</td><td>${item.transaction_id||''}</td><td>${item.payment_status||''}</td><td>${item.created_at||''}</td>`; pm.table.appendChild(tr); }); }
  pm?.load?.addEventListener('click', paymentsList);

  // Site settings
  const st = { seoTitle:document.getElementById('site-seo-title'), seoDesc:document.getElementById('site-seo-desc'), phone:document.getElementById('site-phone'), email:document.getElementById('site-email'), whatsapp:document.getElementById('site-whatsapp'), og:document.getElementById('site-og'), footer:document.getElementById('site-footer'), save:document.getElementById('site-save'), load:document.getElementById('site-load'), msg:document.getElementById('site-msg') };
  async function siteLoad(){ st.msg.textContent=''; const res = await fetch(withToken('/api/admin-site.php'), { headers: authHeaders() }); const data=await res.json().catch(()=>({})); if(!res.ok||data.success===false){ st.msg.textContent='Error loading'; return; } const it=data.item||{}; st.seoTitle.value=it.seo_title||''; st.seoDesc.value=it.seo_description||''; st.phone.value=it.phone||''; st.email.value=it.email||''; st.whatsapp.value=it.support_whatsapp||''; st.og.value=it.og_image||''; st.footer.value=it.footer_html||''; st.msg.textContent='Loaded.'; }
  async function siteSave(){ st.msg.textContent=''; const body={ seo_title:st.seoTitle.value, seo_description:st.seoDesc.value, phone:st.phone.value, email:st.email.value, support_whatsapp:st.whatsapp.value, og_image:st.og.value, footer_html:st.footer.value }; const res = await fetch(withToken('/api/admin-site.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json().catch(()=>({})); if(!res.ok||data.success===false){ st.msg.textContent='Save error'; return; } st.msg.textContent='Saved.'; }
  st?.save?.addEventListener('click', siteSave); st?.load?.addEventListener('click', siteLoad);

  // Pages
  const pg = { slug:document.getElementById('pg-slug'), title:document.getElementById('pg-title'), metaTitle:document.getElementById('pg-meta-title'), metaDesc:document.getElementById('pg-meta-desc'), html:document.getElementById('pg-html'), published:document.getElementById('pg-published'), publishAt:document.getElementById('pg-publish-at'), create:document.getElementById('pg-create'), load:document.getElementById('pg-load'), msg:document.getElementById('pg-msg'), table:document.querySelector('#pg-table tbody') };
  async function pagesList(){ pg.msg.textContent=''; pg.table.innerHTML=''; const res = await fetch(withToken('/api/admin-pages.php'), { headers: authHeaders() }); const data = await res.json(); if(!res.ok||data.success===false){ pg.msg.textContent='Error'; return; } (data.items||[]).forEach(item=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.id||''}</td><td>${item.slug||''}</td><td>${item.title||''}</td><td>${item.is_published?'Yes':'No'}</td><td>${item.published_at||''}</td><td></td>`; pg.table.appendChild(tr); }); }
  async function pageCreate(){ const body={ slug:pg.slug.value.trim(), title:pg.title.value.trim(), meta_title:pg.metaTitle.value, meta_description:pg.metaDesc.value, content_html:pg.html.value, is_published:(pg.published.value==='true'), published_at:pg.publishAt.value.trim()||null }; const res = await fetch(withToken('/api/admin-pages.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data = await res.json(); if(!res.ok||data.success===false){ pg.msg.textContent='Create failed'; return; } pg.msg.textContent='Saved.'; pagesList(); }
  pg?.create?.addEventListener('click', pageCreate); pg?.load?.addEventListener('click', pagesList);

  // Hero banners
  const hr = { title:document.getElementById('hr-title'), subtitle:document.getElementById('hr-subtitle'), ctaText:document.getElementById('hr-cta-text'), ctaHref:document.getElementById('hr-cta-href'), bg:document.getElementById('hr-bg'), active:document.getElementById('hr-active'), start:document.getElementById('hr-start'), end:document.getElementById('hr-end'), save:document.getElementById('hr-save'), load:document.getElementById('hr-load'), msg:document.getElementById('hr-msg'), table:document.querySelector('#hr-table tbody') };
  async function heroList(){ hr.msg.textContent=''; hr.table.innerHTML=''; const res = await fetch(withToken('/api/admin-hero.php'), { headers: authHeaders() }); const data = await res.json(); if(!res.ok||data.success===false){ hr.msg.textContent='Error'; return; } (data.items||[]).forEach(item=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.id||''}</td><td>${item.title||''}</td><td>${item.is_active?'Yes':'No'}</td><td>${item.start_at||''}</td><td>${item.end_at||''}</td><td></td>`; hr.table.appendChild(tr); }); }
  async function heroSave(){ const body={ title:hr.title.value.trim(), subtitle:hr.subtitle.value.trim(), cta_text:hr.ctaText.value.trim(), cta_href:hr.ctaHref.value.trim(), background_url:hr.bg.value.trim(), is_active:(hr.active.value==='true'), start_at:hr.start.value.trim()||null, end_at:hr.end.value.trim()||null }; const res = await fetch(withToken('/api/admin-hero.php'), { method:'POST', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json(); if(!res.ok||data.success===false){ hr.msg.textContent='Save error'; return; } hr.msg.textContent='Saved.'; heroList(); }
  hr?.save?.addEventListener('click', heroSave); hr?.load?.addEventListener('click', heroList);

  // Keyboard shortcuts & toasts
  function toast(msg){ const t=document.createElement('div'); t.textContent=msg; Object.assign(t.style,{position:'fixed',right:'16px',bottom:'16px',background:'#1f2a4d',color:'#fff',padding:'10px 12px',borderRadius:'8px',border:'1px solid #253057',zIndex:9999,boxShadow:'0 2px 10px rgba(0,0,0,0.3)'}); document.body.appendChild(t); setTimeout(()=>t.remove(),2500); }
  document.addEventListener('keydown', (e)=>{
    const visible = Object.entries(els.views).find(([k,el])=>!el.classList.contains('hidden'))?.[0];
    if(e.key==='/' && !e.ctrlKey && !e.metaKey){ e.preventDefault(); const first=els.views[visible]?.querySelector('input,select,textarea'); first?.focus(); }
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault();
      if(visible==='routes') document.getElementById('r-create')?.click();
      if(visible==='buses') document.getElementById('b-create')?.click();
      if(visible==='schedules') document.getElementById('s-create')?.click();
      if(visible==='pricing') document.getElementById('savePricing')?.click();
      if(visible==='offers') document.getElementById('o-create')?.click();
      if(visible==='pages') document.getElementById('pg-create')?.click();
      if(visible==='hero') document.getElementById('hr-save')?.click();
      if(visible==='site') document.getElementById('site-save')?.click();
      toast('Saved');
    }
    if(e.key==='g' && !e.ctrlKey && !e.metaKey){ const map={r:'routes',b:'buses',s:'schedules',p:'pricing',o:'offers',h:'hero',a:'pages',t:'site'}; const onKey=(ev)=>{ const view=map[ev.key]; if(view){ show(view); toast('Go '+view); document.removeEventListener('keydown', onKey, true); } }; document.addEventListener('keydown', onKey, true); setTimeout(()=>document.removeEventListener('keydown',onKey,true),1500); }
  });

  // KPI dashboard
  const kpi = { revenue:document.getElementById('kpi-revenue'), bookings:document.getElementById('kpi-bookings'), routes:document.getElementById('kpi-routes'), buses:document.getElementById('kpi-buses'), schedules:document.getElementById('kpi-schedules'), offers:document.getElementById('kpi-offers'), auto:document.getElementById('kpi-auto'), btn:document.getElementById('kpi-refresh') };
  let kpiTimer=null; async function kpiRefresh(){ try{ const res=await fetch(withToken('/api/admin-kpi.php'), { headers: authHeaders() }); const d=await res.json(); if(res.ok){ const v=d.kpi||{}; kpi.revenue.textContent='₹'+Number(v.revenue||0).toLocaleString('en-IN'); kpi.bookings.textContent=Number(v.bookings||0); kpi.routes.textContent=Number(v.routes||0); kpi.buses.textContent=Number(v.buses||0); kpi.schedules.textContent=Number(v.schedules||0); kpi.offers.textContent=Number(v.offers||0);} }catch(_){ }
  if(kpi.auto?.checked){ clearTimeout(kpiTimer); kpiTimer=setTimeout(kpiRefresh, 30000); } }
  kpi.btn?.addEventListener('click', kpiRefresh); kpi.auto?.addEventListener('change', kpiRefresh);

  // Pagination state
  const state = { routes:{page:0, limit:50, auto:false}, buses:{page:0, limit:50, auto:false} };

  // Update routes list to use pagination
  async function routesList(){
    r.msg.textContent=''; r.table.innerHTML='';
    const fo = (document.getElementById('r-filter-origin')?.value||'').trim();
    const fd = (document.getElementById('r-filter-destination')?.value||'').trim();
    state.routes.limit = Number(document.getElementById('r-page-size')?.value||50);
    const offset = state.routes.page * state.routes.limit;
    const qs=[]; if(fo) qs.push('origin='+encodeURIComponent(fo)); if(fd) qs.push('destination='+encodeURIComponent(fd)); qs.push('limit='+state.routes.limit); qs.push('offset='+offset);
    const url = withToken('/api/admin-routes.php'+(qs.length?('?'+qs.join('&')):''));
    const res = await fetch(url, { headers: authHeaders() });
    const data = await res.json(); if(!res.ok||data.success===false){ r.msg.textContent = 'Error loading routes'; return; }
    (data.items||[]).forEach(item=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${item.id||''}</td><td>${item.origin||''}</td><td>${item.destination||''}</td><td>${item.distance_km??''}</td><td>${item.duration_hours??''}</td><td><button class='btn btn-sm' data-action='edit'>Edit</button> <button class='btn secondary btn-sm' data-action='delete'>Delete</button></td>`;
      tr.querySelector('[data-action="edit"]')?.addEventListener('click',()=>routeEditFill(item));
      tr.querySelector('[data-action="delete"]')?.addEventListener('click',()=>routeDelete(item.id));
      r.table.appendChild(tr);
    });
    if(state.routes.auto){ setTimeout(routesList, 30000); }
  }
  document.getElementById('r-prev')?.addEventListener('click', ()=>{ state.routes.page=Math.max(0,state.routes.page-1); routesList(); });
  document.getElementById('r-next')?.addEventListener('click', ()=>{ state.routes.page++; routesList(); });
  document.getElementById('r-page-size')?.addEventListener('change', ()=>{ state.routes.page=0; routesList(); });
  document.getElementById('r-auto')?.addEventListener('change', (e)=>{ state.routes.auto=!!e.target.checked; if(state.routes.auto) routesList(); });

  // Update buses list to use pagination and filter
  async function busesList(){ b.msg.textContent=''; b.table.innerHTML=''; state.buses.limit=Number(document.getElementById('b-page-size')?.value||50); const offset=state.buses.page*state.buses.limit; const qs=['limit='+state.buses.limit,'offset='+offset]; const res = await fetch(withToken('/api/admin-buses.php?'+qs.join('&')), { headers: authHeaders() }); const data = await res.json(); if(!res.ok||data.success===false){ b.msg.textContent='Error'; return; } const filt=(document.getElementById('b-filter-type')?.value||'').toLowerCase(); (data.items||[]).filter(it=>!filt||String(it.bus_type||'').toLowerCase().includes(filt)).forEach(item=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${item.id||''}</td><td>${item.bus_type||''}</td><td>${item.total_seats??''}</td><td>${(item.amenities||[]).join(', ')}</td><td><button class='btn btn-sm' data-action='edit'>Edit</button> <button class='btn secondary btn-sm' data-action='delete'>Delete</button></td>`; tr.querySelector('[data-action="edit"]')?.addEventListener('click',()=>busEditFill(item)); tr.querySelector('[data-action="delete"]')?.addEventListener('click',()=>busDelete(item.id)); b.table.appendChild(tr); }); if(state.buses.auto){ setTimeout(busesList,30000); } }
  document.getElementById('b-prev')?.addEventListener('click', ()=>{ state.buses.page=Math.max(0,state.buses.page-1); busesList(); });
  document.getElementById('b-next')?.addEventListener('click', ()=>{ state.buses.page++; busesList(); });
  document.getElementById('b-page-size')?.addEventListener('change', ()=>{ state.buses.page=0; busesList(); });
  document.getElementById('b-auto')?.addEventListener('change', (e)=>{ state.buses.auto=!!e.target.checked; if(state.buses.auto) busesList(); });

  // Pricing autosave (debounced)
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); } }
  const tryAutoSave = debounce(()=>{ const origin=p.origin.value.trim(), destination=p.destination.value.trim(); if(origin&&destination) savePricing(); }, 800);
  p.allowed?.addEventListener('input', tryAutoSave); p.active?.addEventListener('change', tryAutoSave); p.enabled?.addEventListener('change', tryAutoSave);

  // Schedules inline edit
  let sEditId=null; function scheduleEditFill(item){ s.route.value=item.route_id||''; s.bus.value=item.bus_id||''; s.dep.value=item.departure_time||''; s.arr.value=item.arrival_time||''; s.price.value=item.base_price??''; s.active.value=item.is_active?'true':'false'; sEditId=item.id||null; document.getElementById('s-create').textContent = sEditId? 'Save':'Create'; }
  async function scheduleSave(){ const body={ route_id:s.route.value.trim(), bus_id:s.bus.value.trim(), departure_time:s.dep.value.trim(), arrival_time:s.arr.value.trim(), base_price:Number(s.price.value||0), is_active:(s.active.value==='true') }; if(!body.route_id||!body.bus_id){ s.msg.textContent='Pick route and bus using search'; return; } if(sEditId){ body.id=sEditId; const res=await fetch(withToken('/api/admin-schedules.php'), { method:'PATCH', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json(); if(!res.ok||data.success===false){ s.msg.textContent='Update failed'; return; } s.msg.textContent='Updated.'; sEditId=null; document.getElementById('s-create').textContent='Create'; } else { await scheduleCreate(); } schedulesList(); }
  s.create?.removeEventListener?.('click', scheduleCreate); s.create.addEventListener('click', scheduleSave);
  // Add Edit buttons on list
  const _oldSchedulesList = schedulesList; schedulesList = async function(){ await _oldSchedulesList(); (s.table?.querySelectorAll('tr')||[]).forEach(tr=>{ const id=tr.querySelector('button')?.dataset?.id; if(!id){ const cells=tr.querySelectorAll('td'); const editBtn=document.createElement('button'); editBtn.className='btn btn-sm'; editBtn.textContent='Edit'; const idCell=cells?.[0]?.textContent||''; editBtn.addEventListener('click', ()=> scheduleEditFill({ id:idCell, route_id:cells?.[1]?.textContent||'', bus_id:cells?.[2]?.textContent||'', departure_time:cells?.[3]?.textContent||'', arrival_time:cells?.[4]?.textContent||'', base_price:Number(cells?.[5]?.textContent||0), is_active:(cells?.[6]?.textContent||'')==='Yes' })); const actionCell=tr.lastElementChild; actionCell?.prepend(editBtn); } }); }

  // Offers inline edit
  let oEditId=null; function offerEditFill(item){ o.code.value=item.code||''; o.type.value=item.discount_type||'percent'; o.amount.value=item.amount??''; o.active.value=item.is_active?'true':'false'; (o.from&&(o.from.value=item.valid_from||'')); (o.to&&(o.to.value=item.valid_until||'')); oEditId=item.id||null; document.getElementById('o-create').textContent = oEditId? 'Save':'Create'; }
  async function offerSave(){ const body={ code:o.code.value.trim(), discount_type:o.type.value, amount:Number(o.amount.value||0), is_active:(o.active.value==='true'), valid_from:o.from?.value?.trim()||null, valid_to:o.to?.value?.trim()||null }; if(oEditId){ body.id=oEditId; const res=await fetch(withToken('/api/admin-offers.php'), { method:'PATCH', headers: authHeaders(), body: JSON.stringify(body) }); const data=await res.json(); if(!res.ok||data.success===false){ o.msg.textContent='Update failed'; return; } o.msg.textContent='Updated.'; oEditId=null; document.getElementById('o-create').textContent='Create'; } else { await offerCreate(); } offersList(); }
  o.create?.removeEventListener?.('click', offerCreate); o.create.addEventListener('click', offerSave);
  const _oldOffersList = offersList; offersList = async function(){ await _oldOffersList(); (o.table?.querySelectorAll('tr')||[]).forEach(tr=>{ const cells=tr.querySelectorAll('td'); const idCell=cells?.[0]?.textContent||''; const item={ id:idCell, code:cells?.[1]?.textContent||'', discount_type:cells?.[2]?.textContent||'', amount:Number(cells?.[3]?.textContent||0), is_active:(cells?.[4]?.textContent||'')==='Yes' }; const editBtn=document.createElement('button'); editBtn.className='btn btn-sm'; editBtn.textContent='Edit'; editBtn.addEventListener('click', ()=> offerEditFill(item)); const actionCell=tr.lastElementChild; actionCell?.prepend(editBtn); }); }

  // Default view
  show('dashboard');
})();
