(function(){
  const apiBase = '/api/admin-pricing.php';
  const els = {
    token: document.getElementById('token'),
    tokenStatus: document.getElementById('tokenStatus'),
    saveToken: document.getElementById('saveToken'),
    origin: document.getElementById('origin'),
    destination: document.getElementById('destination'),
    loadBtn: document.getElementById('loadBtn'),
    listAllBtn: document.getElementById('listAllBtn'),
    routeMsg: document.getElementById('routeMsg'),
    allowedFares: document.getElementById('allowedFares'),
    activeFare: document.getElementById('activeFare'),
    enabled: document.getElementById('enabled'),
    savePricing: document.getElementById('savePricing'),
    saveMsg: document.getElementById('saveMsg'),
    listTableBody: document.querySelector('#listTable tbody')
  };

  function getToken(){ return localStorage.getItem('admin_token') || ''; }
  function setToken(val){ localStorage.setItem('admin_token', val || ''); }
  function updateTokenStatus(){ els.tokenStatus.textContent = getToken() ? 'Token saved' : 'Not saved'; }

  async function api(method, paramsOrBody){
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', 'X-Admin-Token': token };
    let url = apiBase;
    let body = null;
    if (method === 'GET'){
      const qs = new URLSearchParams(paramsOrBody || {}).toString();
      url += qs ? ('?' + qs) : '';
    } else {
      body = JSON.stringify(paramsOrBody || {});
    }
    const res = await fetch(url, { method, headers, body });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || data.success === false) throw new Error(data.error || 'Request failed');
    return data;
  }

  function parseFares(str){
    return (str || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length)
      .map(s => Number(s))
      .filter(n => Number.isFinite(n))
      .map(n => Math.round(n));
  }

  function renderActiveFareOptions(fares, selected){
    els.activeFare.innerHTML = '';
    fares.forEach(v => {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = String(v);
      if (selected != null && Number(selected) === Number(v)) opt.selected = true;
      els.activeFare.appendChild(opt);
    });
  }

  function fillPricing(p){
    const fares = (p?.allowed_fares || []).map(Number);
    els.allowedFares.value = fares.join(',');
    renderActiveFareOptions(fares, p?.active_fare);
    els.enabled.checked = !!p?.is_enabled;
  }

  async function loadPricing(){
    els.routeMsg.textContent = '';
    const origin = els.origin.value.trim();
    const destination = els.destination.value.trim();
    if (!origin || !destination){ els.routeMsg.textContent = 'Enter origin and destination'; return; }
    try {
      const { pricing } = await api('GET', { origin, destination });
      if (!pricing){
        // Default to Kalpa->Delhi fares for convenience on first setup
        els.allowedFares.value = '999,1199,1399,1499,1799,1999,2100,2450';
        renderActiveFareOptions(parseFares(els.allowedFares.value), 1499);
        els.enabled.checked = true;
        els.routeMsg.textContent = 'No pricing yet. Configure and Save.';
      } else {
        fillPricing(pricing);
        els.routeMsg.textContent = 'Loaded.';
      }
    } catch (e){
      els.routeMsg.textContent = 'Error: ' + e.message;
    }
  }

  async function savePricing(){
    els.saveMsg.textContent = '';
    const origin = els.origin.value.trim();
    const destination = els.destination.value.trim();
    if (!origin || !destination){ els.saveMsg.textContent = 'Enter origin and destination'; return; }
    const fares = parseFares(els.allowedFares.value);
    if (!fares.length){ els.saveMsg.textContent = 'Enter at least one allowed fare'; return; }
    const active = Number(els.activeFare.value || fares[0]);
    if (!fares.includes(active)) fares.push(active);
    fares.sort((a,b)=>a-b);

    try {
      const payload = {
        origin,
        destination,
        allowed_fares: fares,
        active_fare: active,
        is_enabled: !!els.enabled.checked
      };
      const { pricing } = await api('POST', payload);
      fillPricing(pricing);
      els.saveMsg.textContent = 'Saved.';
      await listAll();
    } catch(e){
      els.saveMsg.textContent = 'Error: ' + e.message;
    }
  }

  async function listAll(){
    try {
      const { items } = await api('GET', {});
      const tbody = els.listTableBody;
      tbody.innerHTML = '';
      (items || []).forEach(row => {
        const tr = document.createElement('tr');
        const r = row.routes || {};
        tr.innerHTML = `
          <td>${r.origin || ''}</td>
          <td>${r.destination || ''}</td>
          <td><span class="pill">${row.active_fare ?? ''}</span></td>
          <td>${row.is_enabled ? 'Yes' : 'No'}</td>
          <td>${(row.allowed_fares || []).join(', ')}</td>
          <td>${row.updated_at || ''}</td>
          <td><button class="btn secondary btn-small">Load</button></td>
        `;
        tr.querySelector('button')?.addEventListener('click', ()=>{
          els.origin.value = r.origin || '';
          els.destination.value = r.destination || '';
          fillPricing(row);
          els.routeMsg.textContent = 'Loaded from list.';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        tbody.appendChild(tr);
      });
    } catch(e){
      console.warn('List error', e);
    }
  }

  // Wire events
  els.token.value = getToken();
  updateTokenStatus();
  els.saveToken.addEventListener('click', ()=>{ setToken(els.token.value); updateTokenStatus(); });
  els.loadBtn.addEventListener('click', loadPricing);
  els.savePricing.addEventListener('click', savePricing);
  els.listAllBtn.addEventListener('click', listAll);

  // Initialize defaults for quick demo
  if (!els.origin.value) els.origin.value = 'Kalpa';
  if (!els.destination.value) els.destination.value = 'Delhi';
  listAll();
})();