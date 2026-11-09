const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Upload directory
const directoryPath = path.join(__dirname, '../public/images');

if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, directoryPath);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + '-' +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});


// GET ALL ITEMS
router.get('/', async (req, res, next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems');

        const items = await collection.find({}).toArray();

        return res.json(items);

    } catch (e) {
        logger.error(e);
        next(e);
    }
});


// POST NEW ITEM
router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems');

        const secondChanceItem = { ...req.body };

        const lastItem = await collection
            .find({})
            .sort({ id: -1 })
            .limit(1)
            .toArray();

        if (lastItem.length > 0) {
            secondChanceItem.id = (
                parseInt(lastItem[0].id, 10) + 1
            ).toString();
        } else {
            secondChanceItem.id = '1';
        }

        if (req.file) {
            secondChanceItem.image = req.file.filename;
        }

        if (secondChanceItem.age_days !== undefined) {
            secondChanceItem.age_days = Number(
                secondChanceItem.age_days
            );

            secondChanceItem.age_years = Number(
                (secondChanceItem.age_days / 365).toFixed(1)
            );
        }

        secondChanceItem.date_added = Math.floor(
            Date.now() / 1000
        );

        secondChanceItem.createdAt = new Date();

        await collection.insertOne(secondChanceItem);

        logger.info('Item created successfully');

        return res.status(201).json(secondChanceItem);

    } catch (e) {
        logger.error(e);
        next(e);
    }
});


// GET ITEM BY ID
router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems');

        const item = await collection.findOne({
            id: req.params.id
        });

        if (!item) {
            return res.status(404).json({
                error: 'secondChanceItem not found'
            });
        }

        return res.json(item);

    } catch (e) {
        logger.error(e);
        next(e);
    }
});


// UPDATE ITEM
router.put('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems');

        const id = req.params.id;

        const item = await collection.findOne({ id });

        if (!item) {
            return res.status(404).json({
                error: 'secondChanceItem not found'
            });
        }

        const updateData = {
            updatedAt: new Date()
        };

        const allowedFields = [
            'name',
            'category',
            'condition',
            'description',
            'age_days'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (updateData.age_days !== undefined) {
            updateData.age_days = Number(updateData.age_days);

            updateData.age_years = Number(
                (updateData.age_days / 365).toFixed(1)
            );
        }

        const result = await collection.updateOne(
            { id },
            { $set: updateData }
        );

        logger.info('Item updated successfully');

        return res.json({
            uploaded: result.modifiedCount >= 0
                ? 'success'
                : 'failed'
        });

    } catch (e) {
        logger.error(e);
        next(e);
    }
});


// DELETE ITEM
router.delete('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems');

        const id = req.params.id;

        const item = await collection.findOne({ id });

        if (!item) {
            return res.status(404).json({
                error: 'secondChanceItem not found'
            });
        }

        await collection.deleteOne({ id });

        logger.info('Item deleted successfully');

        return res.json({
            deleted: 'success'
        });

    } catch (e) {
        logger.error(e);
        next(e);
    }
});

module.exports = router;
