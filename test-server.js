const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Test routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/auth/telegram', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth endpoint working',
    user: { id: 1, username: 'test_user' }
  });
});

app.get('/api/events/upcoming', (req, res) => {
  res.json({ 
    success: true, 
    events: [
      { id: 1, name: 'Test Event', multiplier: 2.0, active: true }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
});