const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const db = new Database(path.join(__dirname, "accunumbo.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'student',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS progress(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 adventure INTEGER NOT NULL DEFAULT 1,
 completed_tasks INTEGER NOT NULL DEFAULT 0,
 xp INTEGER NOT NULL DEFAULT 0,
 coins INTEGER NOT NULL DEFAULT 0,
 badges INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id, adventure),
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS attempts(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 adventure INTEGER NOT NULL,
 task INTEGER NOT NULL,
 attempt_no INTEGER NOT NULL,
 correct INTEGER NOT NULL,
 points INTEGER NOT NULL DEFAULT 0,
 seconds_used INTEGER,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS feedback(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER,
 name TEXT,
 email TEXT,
 rating TEXT,
 enjoyed TEXT,
 improve TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

app.use(express.json({limit:"100kb"}));
app.use(express.static(__dirname));

function tokenFor(user){
  return jwt.sign({id:user.id, role:user.role, email:user.email}, JWT_SECRET, {expiresIn:"7d"});
}
function auth(req,res,next){
  const h=req.headers.authorization||"";
  if(!h.startsWith("Bearer ")) return res.status(401).json({error:"Authentication required"});
  try { req.user=jwt.verify(h.slice(7),JWT_SECRET); next(); }
  catch(e){ return res.status(401).json({error:"Session expired"}); }
}
function safeUser(row){ return {id:row.id,name:row.name,email:row.email,role:row.role}; }

app.post("/api/auth/signup", (req,res)=>{
  const {name,email,password}=req.body||{};
  if(!name||!email||!password||password.length<8) return res.status(400).json({error:"Name, email and a password of at least 8 characters are required."});
  const normalized=email.trim().toLowerCase();
  if(db.prepare("SELECT id FROM users WHERE email=?").get(normalized)) return res.status(409).json({error:"An account with this email already exists."});
  const hash=bcrypt.hashSync(password,12);
  const info=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(name.trim(),normalized,hash);
  db.prepare("INSERT INTO progress(user_id) VALUES(?)").run(info.lastInsertRowid);
  const user=db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(info.lastInsertRowid);
  res.json({user:safeUser(user),token:tokenFor(user)});
});

app.post("/api/auth/login", (req,res)=>{
  const {email,password}=req.body||{};
  const user=db.prepare("SELECT * FROM users WHERE email=?").get((email||"").trim().toLowerCase());
  if(!user||!bcrypt.compareSync(password||"",user.password_hash)) return res.status(401).json({error:"Invalid email or password."});
  res.json({user:safeUser(user),token:tokenFor(user)});
});

app.get("/api/me",auth,(req,res)=>{
  const user=db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(req.user.id);
  const progress=db.prepare("SELECT adventure,completed_tasks,xp,coins,badges,updated_at FROM progress WHERE user_id=? ORDER BY adventure").all(req.user.id);
  res.json({user:safeUser(user),progress});
});

app.post("/api/progress",auth,(req,res)=>{
  const {adventure=1,completed_tasks=0,xp=0,coins=0,badges=0}=req.body||{};
  db.prepare(`INSERT INTO progress(user_id,adventure,completed_tasks,xp,coins,badges)
              VALUES(?,?,?,?,?,?)
              ON CONFLICT(user_id,adventure) DO UPDATE SET
              completed_tasks=excluded.completed_tasks,xp=excluded.xp,coins=excluded.coins,badges=excluded.badges,updated_at=CURRENT_TIMESTAMP`)
    .run(req.user.id,adventure,completed_tasks,xp,coins,badges);
  res.json({ok:true});
});

app.post("/api/attempts",auth,(req,res)=>{
  const {adventure=1,task,attempt_no,correct,points=0,seconds_used=null}=req.body||{};
  if(!task||!attempt_no) return res.status(400).json({error:"Task and attempt number are required."});
  db.prepare(`INSERT INTO attempts(user_id,adventure,task,attempt_no,correct,points,seconds_used)
              VALUES(?,?,?,?,?,?,?)`)
    .run(req.user.id,adventure,task,attempt_no,correct?1:0,points,seconds_used);
  res.json({ok:true});
});

app.post("/api/feedback",(req,res)=>{
  const {name,email,rating,enjoyed,improve}=req.body||{};
  if(!rating) return res.status(400).json({error:"Please provide a rating."});
  let userId=null;
  const h=req.headers.authorization||"";
  if(h.startsWith("Bearer ")){ try{ userId=jwt.verify(h.slice(7),JWT_SECRET).id; }catch(e){} }
  db.prepare("INSERT INTO feedback(user_id,name,email,rating,enjoyed,improve) VALUES(?,?,?,?,?,?)")
    .run(userId,name||null,email||null,rating,enjoyed||"",improve||"");
  res.json({ok:true});
});

app.get("/api/health",(req,res)=>res.json({ok:true,site:"accunumbo.com"}));

app.get("/{*splat}",(req,res)=>{
  if(req.path.startsWith("/api/")) return res.status(404).json({error:"API route not found"});
  res.sendFile(path.join(__dirname,"index.html"));
});

app.listen(PORT,()=>console.log(`AccuNumbo running on http://localhost:${PORT}`));
