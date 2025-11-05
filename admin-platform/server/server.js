import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import pg from 'pg'

const { Pool } = pg
const app = express()

const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const DB_URL = process.env.DATABASE_URL || ''
const pool = DB_URL ? new Pool({ connectionString: DB_URL }) : null

app.use(helmet())
app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(express.json())

function signToken(payload){ return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' }) }
function auth(requiredRole){ return (req,res,next)=>{
  try {
    const h = req.headers.authorization || ''
    const token = h.startsWith('Bearer ')? h.slice(7): ''
    if(!token) return res.status(401).json({ success:false, error:'Unauthorized' })
    const dec = jwt.verify(token, JWT_SECRET)
    if(requiredRole && (!dec.role || (dec.role!==requiredRole && dec.role!=='admin'))) return res.status(403).json({ success:false, error:'Forbidden' })
    req.user = dec; next()
  } catch(e){ return res.status(401).json({ success:false, error:'Unauthorized' }) }
}}

app.get('/health', (_req,res)=> res.json({ ok:true }))

// Auth
app.post('/auth/login', async (req,res)=>{
  const { email, password } = req.body||{}
  if(!email || !password) return res.status(400).json({ success:false, error:'Email and password required' })
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const hash = process.env.ADMIN_PASSWORD_HASH || ''
  if(email!==adminEmail) return res.status(401).json({ success:false, error:'Invalid credentials' })
  if(!(hash && await bcrypt.compare(password, hash))) return res.status(401).json({ success:false, error:'Invalid credentials' })
  const token = signToken({ sub: email, role: 'admin' })
  res.json({ success:true, token })
})

// KPIs (placeholder sums)
app.get('/kpi', auth(), async (_req,res)=>{
  const out = { revenue: 0, bookings: 0, active_routes: 0, occupancy: 0 }
  if(!pool){ return res.json({ success:true, kpi: out }) }
  try {
    const rev = await pool.query('select coalesce(sum(amount),0) as revenue from payments')
    const bk  = await pool.query('select count(1) as c from bookings')
    const rt  = await pool.query('select count(1) as c from routes')
    const oc  = await pool.query('select avg(available_seats) as a from seat_availability')
    out.revenue = Number(rev.rows?.[0]?.revenue||0)
    out.bookings = Number(bk.rows?.[0]?.c||0)
    out.active_routes = Number(rt.rows?.[0]?.c||0)
    out.occupancy = Math.max(0, 100 - Number(oc.rows?.[0]?.a||0))
  } catch(_){}
  res.json({ success:true, kpi: out })
})

// Buses (minimal CRUD)
app.get('/buses', auth(), async (_req,res)=>{
  if(!pool) return res.json({ success:true, items: [] })
  try{ const r = await pool.query('select id,bus_type,total_seats,amenities from buses order by created_at desc')
    res.json({ success:true, items: r.rows })
  }catch(e){ res.status(502).json({ success:false, error:'Failed' }) }
})
app.post('/buses', auth('admin'), async (req,res)=>{
  if(!pool) return res.status(503).json({ success:false, error:'DB not configured' })
  const { bus_type, total_seats, amenities=[] } = req.body||{}
  if(!bus_type || !total_seats) return res.status(400).json({ success:false, error:'bus_type and total_seats required' })
  try{ const r = await pool.query('insert into buses(bus_type,total_seats,amenities) values($1,$2,$3) returning id,bus_type,total_seats,amenities',[bus_type,total_seats,amenities])
    res.json({ success:true, item: r.rows[0] })
  }catch(e){ res.status(502).json({ success:false, error:'Failed' }) }
})

app.listen(PORT, ()=> console.log(`[admin-server] listening on :${PORT}`))
