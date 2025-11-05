const http = require('http')
const fs = require('fs')
const path = require('path')
const url = require('url')

const ROOT = process.argv[2] || process.cwd()
const PORT = Number(process.env.PORT) || 5173
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json' }

const server = http.createServer((req,res)=>{
  const parsed = url.parse(req.url)
  let p = path.join(ROOT, decodeURIComponent(parsed.pathname))
  if (p.endsWith('/')) p = path.join(p, 'index.html')
  fs.stat(p, (err, st)=>{
    if(err || !st.isFile()){ res.statusCode=404; res.end('Not found'); return }
    const ext = path.extname(p).toLowerCase()
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
    fs.createReadStream(p).pipe(res)
  })
})
server.listen(PORT, ()=> console.log(`[static] serving ${ROOT} on :${PORT}`))
