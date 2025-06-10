const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

const users = {
  jdog: { password: 'rich', balance: 0 },
};

let gamePool = {
  pool: 0
};

// ✅ Fixed CORS
app.use(cors({
  origin: "https://bargainjoes.com",
  credentials: true
}));

app.use(bodyParser.json());

// ✅ Correct session setup
app.use(
  session({
    secret: 'arcade-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      sameSite: 'none',
      secure: true
    }
  })
);

function authenticateUser(req, res, next) {
  if (!req.session.username || !users[req.session.username]) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  req.user = users[req.session.username];
  next();
}

app.get('/', (req, res) => {
  res.send('Arcade Wallet Backend is running.');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username].password === password) {
    req.session.username = username;
    res.json({ success: true, message: 'Logged in successfully' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logged out' });
  });
});

app.get('/wallet', authenticateUser, (req, res) => {
  res.json({ success: true, balance: req.user.balance });
});

app.post('/fund', authenticateUser, (req, res) => {
  const { amount } = req.body;
  req.user.balance += amount;
  res.json({ success: true, balance: req.user.balance });
});

app.post('/play', authenticateUser, (req, res) => {
  const user = req.user;

  if (user.balance < 1) {
    return res.json({ success: false, message: "Insufficient balance." });
  }

  user.balance -= 1;
  gamePool.pool += 1;

  let message = "Played game. Good luck!";
  let reward = 0;

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
  console.log(`Arcade Wallet Backend listening at http://localhost:${port}`);
});
app.get('/check-session', (req, res) => {
  res.json({
    username: req.session.username || null
  });
});
