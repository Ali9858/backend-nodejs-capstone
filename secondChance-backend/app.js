/*jshint esversion: 8 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const pinoLogger = require('./logger');
const pinoHttp = require('pino-http');

const connectToDatabase = require('./models/db');

const app = express();

const port = process.env.PORT || 3061;

// Middleware
app.use(cors());
app.use(express.json());

app.use(pinoHttp({
    logger: pinoLogger
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/authRoutes');

const secondChanceItemsRoutes =
    require('./routes/secondChanceItemsRoutes');

const searchRoutes =
    require('./routes/searchRoutes');

// API endpoints
app.use('/api/auth', authRoutes);

app.use(
    '/api/secondchance/items',
    secondChanceItemsRoutes
);

app.use(
    '/api/secondchance/search',
    searchRoutes
);

// Home route
app.get('/', (req, res) => {
    res.send('Inside the server');
});

// Global Error Handler
app.use((err, req, res, next) => {
    pinoLogger.error(err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: 'Internal Server Error'
    });
});

// Start server
async function startServer() {
    try {
        await connectToDatabase();

        pinoLogger.info('Connected to DB');

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });

    } catch (error) {
        pinoLogger.error(error);

        console.error('Failed to connect to DB:', error);

        process.exit(1);
    }
}

startServer();

module.exports = app;
