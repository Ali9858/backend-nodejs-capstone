const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define upload directory
const directoryPath = path.join(__dirname, '../public/images');

if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, directoryPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage: storage });


// STEP 2: GET all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');

    try {
        // Task 1
        const db = await connectToDatabase();

        // Task 2
        const collection = db.collection("secondChanceItems");

        // Task 3
        const secondChanceItems = await collection.find({}).toArray();

        // Task 4
        res.json(secondChanceItems);

    } catch (e) {
        logger.error('Oops something went wrong', e);
        next(e);
    }
});


// STEP 3: POST new secondChanceItem
router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        // Task 1
        const db = await connectToDatabase();

        // Task 2
        const collection = db.collection("secondChanceItems");

        // Task 3
        let secondChanceItem = req.body;

        // Task 4
        const lastItem = await collection
            .find({})
            .sort({ id: -1 })
            .limit(1)
            .toArray();

        if (lastItem.length > 0) {
            secondChanceItem.id =
                (parseInt(lastItem[0].id, 10) + 1).toString();
        } else {
            secondChanceItem.id = "1";
        }

        // Task 5
        const date_added = Math.floor(Date.now() / 1000);
        secondChanceItem.date_added = date_added;

        // Task 6: Insert into MongoDB
        const result = await collection.insertOne(secondChanceItem);

        // Task 7: Save uploaded image information
        if (req.file) {
            await collection.updateOne(
                { _id: result.insertedId },
                { $set: { image: req.file.filename } }
            );
            secondChanceItem.image = req.file.filename;
        }

        res.status(201).json(secondChanceItem);

    } catch (e) {
        next(e);
    }
});


// STEP 4: GET item by ID
router.get('/:id', async (req, res, next) => {
    try {
        // Task 1
        const db = await connectToDatabase();

        // Task 2
        const collection = db.collection("secondChanceItems");

        // Task 3
        const id = req.params.id;
        const secondChanceItem = await collection.findOne({ id: id });

        // Task 4
        if (!secondChanceItem) {
            return res.status(404).send("secondChanceItem not found");
        }

        res.json(secondChanceItem);

    } catch (e) {
        next(e);
    }
});


// STEP 5: UPDATE existing item
router.put('/:id', async (req, res, next) => {
    try {
        // Task 1
        const db = await connectToDatabase();

        // Task 2
        const collection = db.collection("secondChanceItems");

        const id = req.params.id;

        // Task 3
        const secondChanceItem = await collection.findOne({ id });

        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');

            return res.status(404).json({
                error: "secondChanceItem not found"
            });
        }

        // Task 4
        secondChanceItem.category = req.body.category;
        secondChanceItem.condition = req.body.condition;
        secondChanceItem.age_days = Number(req.body.age_days);
        secondChanceItem.description = req.body.description;

        secondChanceItem.age_years = Number(
            (secondChanceItem.age_days / 365).toFixed(1)
        );

        secondChanceItem.updatedAt = new Date();

        const updateResult = await collection.findOneAndUpdate(
            { id },
            { $set: secondChanceItem },
            { returnDocument: 'after' }
        );

        // Task 5
        if (updateResult) {
            res.json({ uploaded: "success" });
        } else {
            res.json({ uploaded: "failed" });
        }

    } catch (e) {
        next(e);
    }
});


// STEP 6: DELETE existing item
router.delete('/:id', async (req, res, next) => {
    try {
        // Task 1
        const db = await connectToDatabase();

        // Task 2
        const collection = db.collection("secondChanceItems");

        const id = req.params.id;

        // Task 3
        const secondChanceItem = await collection.findOne({ id });

        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');

            return res.status(404).json({
                error: "secondChanceItem not found"
            });
        }

        // Task 4
        await collection.deleteOne({ id });

        res.json({ deleted: "success" });

    } catch (e) {
        next(e);
    }
});

module.exports = router;
