const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = 'your-super-secret-key';

const users = {
  jdog: { password: 'rich', balance: 0 },
};

let gamePool = {
  pool: 0
};

app.use(cors({
  origin: "https://bargainjoes.com",
  credentials: true
}));
app.use(bodyParser.json());

// ✅ Middleware to verify the token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.username = user.username;
    next();
  });
}

app.get('/', (req, res) => {
  res.send('Arcade Wallet Backend (JWT) is running.');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username].password === password) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/wallet', authenticateToken, (req, res) => {
  const user = users[req.username];
  res.json({ success: true, balance: user.balance });
});

app.post('/fund', authenticateToken, (req, res) => {
  const user = users[req.username];
  const { amount } = req.body;
  user.balance += amount;
  res.json({ success: true, balance: user.balance });
});

app.post('/play', authenticateToken, (req, res) => {
  const user = users[req.username];

  if (user.balance < 1) {
    return res.json({ success: false, message: "Insufficient balance." });
  }

  user.balance -= 1;
  gamePool.pool += 1;

  let reward = 0;
  let message = "Played game. Good luck!";

  if (gamePool.pool >= 10) {
    reward = 8;
    user.balance += reward;
    gamePool.pool = 0;
    message = `🎉 You hit the bonus round and won $${reward}! House kept $2.`;
  }

  res.json({
    success: true,
    balance: user.balance,
    message,
    reward
  });
});

app.listen(port, () => {
  console.log(`Arcade Wallet Backend (JWT) listening on port ${port}`);
});
