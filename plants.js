const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "plant_ai"
});

db.connect(err => {
  if(err) throw err;
  console.log("MySQL Connected...");
});

/* SIGNUP */
app.post("/signup", async (req,res)=>{
  const {username,email,password} = req.body;
  const hashed = await bcrypt.hash(password,10);

  db.query(
    "INSERT INTO users (username,email,password) VALUES (?,?,?)",
    [username,email,hashed],
    (err,result)=>{
      if(err) return res.status(400).send("User already exists");
      res.send("Signup successful");
    }
  );
});

/* LOGIN */
app.post("/login", (req,res)=>{
  const {email,password} = req.body;

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],
    async (err,result)=>{
      if(result.length===0) return res.status(400).send("User not found");

      const valid = await bcrypt.compare(password,result[0].password);
      if(!valid) return res.status(400).send("Wrong password");

      res.send(result[0]);
    }
  );
});

/* FORGOT PASSWORD */
app.post("/forgot", async (req,res)=>{
  const {email,newPassword} = req.body;
  const hashed = await bcrypt.hash(newPassword,10);

  db.query(
    "UPDATE users SET password=? WHERE email=?",
    [hashed,email],
    (err,result)=>{
      res.send("Password updated");
    }
  );
});

app.listen(5000,()=>console.log("Server running on port 5000"));