const express = require('express');
const connectDB = require('./config/db');
const progressRoutes = require('./routes/progress');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/progress', progressRoutes);

// Route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});