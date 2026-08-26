const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "accunumbo-development-secret-change-before-production";

const db = new Database(path.join(__dirname, "accunumbo.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  total_xp INTEGER DEFAULT 0,
  total_coins INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS adventure_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  adventure INTEGER NOT NULL,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  adventure INTEGER NOT NULL,
  task_no INTEGER NOT NULL,
  attempt INTEGER NOT NULL,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, "public")));

function auth(req,res,next){
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if(!token) return res.status(401).json({error:"Please login first."});
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({error:"Session expired. Please login again."});
  }
}

function safeUser(u){
  return {id:u.id,name:u.name,email:u.email,role:u.role,total_xp:u.total_xp,total_coins:u.total_coins};
}

app.get("/api/health",(req,res)=>res.json({ok:true,app:"AccuNumbo Adventures"}));

app.post("/api/auth/signup", async (req,res)=>{
  try{
    const {name,email,password} = req.body;
    if(!name || !email || !password) return res.status(400).json({error:"Please fill all fields."});
    if(password.length < 6) return res.status(400).json({error:"Password must contain at least 6 characters."});
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE email=?").get(cleanEmail);
    if(existing) return res.status(409).json({error:"An account with this email already exists. Please login."});
    const hash = await bcrypt.hash(password,10);
    const r = db.prepare("INSERT INTO users(name,email,password) VALUES(?,?,?)").run(String(name).trim(),cleanEmail,hash);
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(r.lastInsertRowid);
    const token = jwt.sign({id:user.id,email:user.email,role:user.role},JWT_SECRET,{expiresIn:"7d"});
    res.json({ok:true,token,user:safeUser(user)});
  }catch(e){ console.error(e); res.status(500).json({error:"Registration failed."}); }
});

app.post("/api/auth/login", async (req,res)=>{
  try{
    const {email,password} = req.body;
    if(!email || !password) return res.status(400).json({error:"Email and password are required."});
    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE email=?").get(cleanEmail);
    if(!user) return res.status(401).json({error:"Invalid email or password."});
    const ok = await bcrypt.compare(password,user.password);
    if(!ok) return res.status(401).json({error:"Invalid email or password."});
    const token = jwt.sign({id:user.id,email:user.email,role:user.role},JWT_SECRET,{expiresIn:"7d"});
    res.json({ok:true,token,user:safeUser(user)});
  }catch(e){ console.error(e); res.status(500).json({error:"Login failed."}); }
});

app.get("/api/me",auth,(req,res)=>{
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if(!user) return res.status(401).json({error:"User not found."});
  const progress = db.prepare(`
    SELECT adventure, SUM(xp) AS xp, SUM(coins) AS coins,
           COUNT(DISTINCT task_no) AS completed_tasks
    FROM task_results WHERE user_id=? GROUP BY adventure
  `).all(user.id);
  res.json({user:safeUser(user),progress});
});

app.post("/api/progress/task",auth,(req,res)=>{
  const {adventure=1,taskNo,attempt,xp=0,coins=0} = req.body;
  if(!taskNo || !attempt) return res.status(400).json({error:"Task details are required."});
  const r = db.prepare(`
    INSERT INTO task_results(user_id,adventure,task_no,attempt,xp,coins)
    VALUES(?,?,?,?,?,?)
  `).run(req.user.id,adventure,taskNo,attempt,xp,coins);
  db.prepare("UPDATE users SET total_xp=total_xp+?, total_coins=total_coins+? WHERE id=?")
    .run(xp,coins,req.user.id);
  res.json({ok:true,id:r.lastInsertRowid});
});

app.post("/api/progress/adventure",auth,(req,res)=>{
  const {adventure=1,xp=0,coins=0,completedTasks=10} = req.body;
  const r = db.prepare(`
    INSERT INTO adventure_results(user_id,adventure,xp,coins,completed_tasks)
    VALUES(?,?,?,?,?)
  `).run(req.user.id,adventure,xp,coins,completedTasks);
  res.json({ok:true,id:r.lastInsertRowid});
});

app.get("/api/leaderboard",(req,res)=>{
  const rows = db.prepare(`
    SELECT name,total_xp,total_coins
    FROM users
    ORDER BY total_xp DESC, total_coins DESC, name ASC
    LIMIT 10
  `).all();
  res.json({leaders:rows});
});

app.get("/api/badge",(req,res)=>{
  res.json({
    rules:[
      {name:"Silver Badge",min:500,icon:"🥈"},
      {name:"Golden Badge",min:1000,icon:"🥇"},
      {name:"Platinum Badge",min:2000,icon:"💎"}
    ]
  });
});

 app.get("/{*splat}", (req, res) => {
if(req.path.startsWith("/api/")) return res.status(404).json({error:"API route not found."});
res.sendFile(path.join(__dirname,"public","index.html"));
});
app.listen(PORT,()=>console.log(`AccuNumbo Adventures running on port ${PORT}`));
