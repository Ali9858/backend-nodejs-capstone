/*jshint esversion: 8 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pinoLogger = require('./logger');
const pinoHttp = require('pino-http');

const connectToDatabase = require('./models/db');

const app = express();
const port = 3061;

// Middleware
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger: pinoLogger }));

// Routes
const authRoutes = require('./routes/authRoutes');
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');
const searchRoutes = require('./routes/searchRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/secondchance/items', secondChanceItemsRoutes);
app.use('/api/secondchance/search', searchRoutes);

// Home route
app.get('/', (req, res) => {
    res.send('Inside the server');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
});

// Start server only after MongoDB connects
async function startServer() {
    try {
        await connectToDatabase();
        pinoLogger.info('Connected to DB');

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to DB:', error);
        process.exit(1);
    }
}

startServer();
