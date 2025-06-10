const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = 'your-super-secret-key';

// ✅ Enable CORS for both your main site and Netlify frontend
app.use(cors({
  origin: [
    "https://bargainjoes.com",
    "https://melodious-pithivier-7f942e.netlify.app",
    "https://zingy-naiad-3e9024.netlify.app" // Make sure this matches your current Netlify URL
  ],
  credentials: true
}));

// ✅ Parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 📦 In-memory user data and game state
const users = {
  jdog: { password: 'rich', balance: 0 },
};

let gamePool = { pool: 0 };
const depositRequests = [];

// 🔐 Middleware to authenticate JWT
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

// ✅ Routes
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

  let reward = 0, message = "Played game. Good luck!";
  if (gamePool.pool >= 10) {
    reward = 8;
    user.balance += reward;
    gamePool.pool = 0;
    message = `🎉 Bonus! You won $${reward}!`;
  }

  res.json({ success: true, balance: user.balance, message, reward });
});

app.post('/deposit-request', authenticateToken, (req, res) => {
  const { amount } = req.body;
  depositRequests.push({ username: req.username, amount, timestamp: new Date() });
  res.json({ success: true, message: 'Deposit requested' });
});

app.get('/admin', (req, res) => {
  const { password } = req.query;
  if (password !== 'amin24') {
    return res.status(403).send('Access Denied');
  }
  const html = `
    <h1>Deposit Requests</h1>
    ${depositRequests.map((r, i) => `
      <div>
        <strong>${r.username}</strong> requested <strong>$${r.amount}</strong> at ${r.timestamp.toLocaleString()}
        <form method="POST" action="/admin/approve">
          <input type="hidden" name="username" value="${r.username}" />
          <input type="hidden" name="amount" value="${r.amount}" />
          <input type="hidden" name="index" value="${i}" />
          <button type="submit">Approve</button>
        </form>
      </div>`
    ).join('')}
  `;
  res.send(html);
});

app.post('/admin/approve', (req, res) => {
  const { username, amount, index } = req.body;
  if (users[username]) {
    users[username].balance += parseFloat(amount);
    depositRequests.splice(index, 1);
    return res.redirect('/admin?password=amin24');
  }
  res.status(404).send('User not found');
});

// ✅ Start the server
app.listen(port, () => {
  console.log(`Arcade Wallet Backend listening on port ${port}`);
});
