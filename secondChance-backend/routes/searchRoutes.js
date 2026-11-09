const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');

// Search items
router.get('/', async (req, res, next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems');

        const query = {};

        // Search by name
        if (req.query.name && req.query.name.trim()) {
            const escapedName = req.query.name.trim().replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
            );

            query.name = {
                $regex: escapedName,
                $options: 'i'
            };
        }

        // Filter by category
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Filter by condition
        if (req.query.condition) {
            query.condition = req.query.condition;
        }

        // Filter by age
        if (req.query.age_years) {
            const age = Number(req.query.age_years);

            if (!Number.isFinite(age) || age < 0) {
                return res.status(400).json({
                    error: 'Invalid age_years'
                });
            }

            query.age_years = {
                $lte: age
            };
        }

        const gifts = await collection.find(query).toArray();

        return res.json(gifts);

    } catch (e) {
        console.error('Search error:', e);
        next(e);
    }
});

module.exports = router;
