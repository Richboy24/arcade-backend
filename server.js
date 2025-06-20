
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = 'supersecret'; // use env variable in production
const DB_FILE = 'db.json';

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

function loadUsers() {
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const users = loadUsers();
  const existing = users.find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ message: 'Username already exists' });
  }

  const newUser = {
    username,
    password,
    balance: 0
  };

  users.push(newUser);
  saveUsers(users);

  const token = jwt.sign({ username: username }, SECRET, { expiresIn: '2h' });
  res.status(201).json({ token });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ username: user.username }, SECRET, { expiresIn: '2h' });
  res.json({ token });
});

app.get('/wallet', authenticateToken, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.username === req.user.username);
  if (!user) return res.sendStatus(404);
  res.json({ balance: user.balance || 0 });
});

app.post('/play', authenticateToken, (req, res) => {
  const { amount } = req.body;
  if (typeof amount !== 'number') return res.status(400).json({ message: 'Invalid amount' });

  const users = loadUsers();
  const user = users.find(u => u.username === req.user.username);
  if (!user) return res.sendStatus(404);

  if (user.balance < amount) return res.status(400).json({ message: 'Insufficient funds' });

  user.balance -= amount;
  saveUsers(users);
  res.json({ balance: user.balance });
});

app.post('/payout', authenticateToken, (req, res) => {
  const { amount } = req.body;
  if (typeof amount !== 'number') return res.status(400).json({ message: 'Invalid amount' });

  const users = loadUsers();
  const user = users.find(u => u.username === req.user.username);
  if (!user) return res.sendStatus(404);

  user.balance += amount;
  saveUsers(users);
  res.json({ balance: user.balance });
});

app.listen(PORT, () => {
  console.log('Arcade Wallet Backend (with CORS & Signup) running on port', PORT);
});
const ADMIN_PASSWORD = 'admin24'; // Admin password for panel

app.get('/users', (req, res) => {
  const auth = req.headers['authorization'];
  if (auth !== ADMIN_PASSWORD) return res.sendStatus(403);
  const users = loadUsers();
  res.json(users);
});

app.post('/update-balance', (req, res) => {
  const auth = req.headers['authorization'];
  if (auth !== ADMIN_PASSWORD) return res.sendStatus(403);

  const { username, balance } = req.body;
  if (typeof username !== 'string' || typeof balance !== 'number') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.balance = balance;
  saveUsers(users);
  res.json({ message: 'Balance updated', balance });
});
