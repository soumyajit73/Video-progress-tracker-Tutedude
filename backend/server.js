const express = require('express');
const connectDB = require('./config/db');
const progressRoutes = require('./routes/progress');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API routes first
app.use('/api/progress', progressRoutes);

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Simple route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Catch-all route for client-side routing
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});