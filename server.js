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

// In-memory deposit requests
const depositRequests = [];

// Handle deposit request (called after redirect from payment page)
app.post('/deposit-request', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const username = req.username;

  depositRequests.push({ username, amount, timestamp: new Date() });
  res.json({ success: true, message: 'Deposit request submitted' });
});

// Admin panel (password protected by query param for now)
app.get('/admin', (req, res) => {
  const { password } = req.query;

  if (password !== 'amin24') {
    return res.status(403).send('Access Denied');
  }

  const html = `
    <h1>Deposit Requests</h1>
    ${depositRequests.map((req, index) => `
      <div style="margin-bottom: 1em;">
        <strong>${req.username}</strong> requested <strong>$${req.amount}</strong> on ${req.timestamp.toLocaleString()}
        <form method="POST" action="/admin/approve" style="display:inline;">
          <input type="hidden" name="username" value="${req.username}" />
          <input type="hidden" name="amount" value="${req.amount}" />
          <input type="hidden" name="index" value="${index}" />
          <button type="submit">Approve</button>
        </form>
      </div>
    `).join('')}
  `;
  res.send(html);
});

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/admin/approve', (req, res) => {
  const { username, amount, index } = req.body;

  if (users[username]) {
    users[username].balance += parseFloat(amount);
    depositRequests.splice(index, 1); // remove approved
    return res.redirect('/admin?password=amin24');
  } else {
    return res.status(404).send('User not found');
  }
});
// In-memory deposit requests
const depositRequests = [];

// Handle deposit request (called after redirect from payment page)
app.post('/deposit-request', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const username = req.username;

  depositRequests.push({ username, amount, timestamp: new Date() });
  res.json({ success: true, message: 'Deposit request submitted' });
});

// Admin panel (password protected by query param for now)
app.get('/admin', (req, res) => {
  const { password } = req.query;

  if (password !== 'amin24') {
    return res.status(403).send('Access Denied');
  }

  const html = `
    <h1>Deposit Requests</h1>
    ${depositRequests.map((req, index) => `
      <div style="margin-bottom: 1em;">
        <strong>${req.username}</strong> requested <strong>$${req.amount}</strong> on ${req.timestamp.toLocaleString()}
        <form method="POST" action="/admin/approve" style="display:inline;">
          <input type="hidden" name="username" value="${req.username}" />
          <input type="hidden" name="amount" value="${req.amount}" />
          <input type="hidden" name="index" value="${index}" />
          <button type="submit">Approve</button>
        </form>
      </div>
    `).join('')}
  `;
  res.send(html);
});

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/admin/approve', (req, res) => {
  const { username, amount, index } = req.body;

  if (users[username]) {
    users[username].balance += parseFloat(amount);
    depositRequests.splice(index, 1); // remove approved
    return res.redirect('/admin?password=amin24');
  } else {
    return res.status(404).send('User not found');
  }
});

