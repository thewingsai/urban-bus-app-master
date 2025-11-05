const API = (path) => (localStorage.getItem('ADMIN_API') || 'http://localhost:4000') + path
let TOKEN = localStorage.getItem('ADMIN_JWT') || ''
const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': TOKEN?('Bearer '+TOKEN):'' })

function qs(id){ return document.getElementById(id) }
function row(cells){ const tr=document.createElement('tr'); tr.innerHTML=cells; return tr }

async function login(){
  const res = await fetch(API('/auth/login'), { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email: qs('email').value.trim(), password: qs('password').value }) })
  const data = await res.json().catch(()=>({}))
  if(!res.ok || data.success===false){ qs('status').textContent='Login failed'; return }
  TOKEN = data.token; localStorage.setItem('ADMIN_JWT', TOKEN); qs('status').textContent='Logged in'
  await loadKPI(); await loadBuses();
}
async function loadKPI(){ try { const r=await fetch(API('/kpi'), { headers: headers() }); const d=await r.json(); if(r.ok) qs('kpi').textContent = JSON.stringify(d.kpi); } catch(_){} }
async function loadBuses(){ try { const r=await fetch(API('/buses'), { headers: headers() }); const d=await r.json(); const tb=document.querySelector('#busesTable tbody'); tb.innerHTML=''; (d.items||[]).forEach(it=> tb.appendChild(row(`<td>${it.bus_type}</td><td>${it.total_seats}</td><td>${(it.amenities||[]).join(', ')}</td>`))) } catch(_){} }
async function createBus(){ const body={ bus_type:qs('busType').value.trim(), total_seats:Number(qs('busSeats').value||0), amenities:(qs('busAmenities').value||'').split(',').map(s=>s.trim()).filter(Boolean) }; const r=await fetch(API('/buses'), { method:'POST', headers: headers(), body: JSON.stringify(body) }); if(r.ok) { await loadBuses(); }
}

qs('login').addEventListener('click', login)
qs('busesLoad').addEventListener('click', loadBuses)
qs('busCreate').addEventListener('click', createBus)

if(TOKEN){ qs('status').textContent='Logged in'; loadKPI(); loadBuses(); }
