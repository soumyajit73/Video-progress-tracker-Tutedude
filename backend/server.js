const express = require('express');
const connectDB = require('./config/db');
const progressRoutes = require('./routes/progress');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json());

app.use('/api/progress', progressRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Welcome to the Video Progress Tracker API!');
});