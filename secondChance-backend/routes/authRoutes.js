const express = require('express');
const router = express.Router();

const connectToDatabase = require('../models/db');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const logger = require('../logger');

const JWT_SECRET = process.env.JWT_SECRET;

function createToken(userId) {
    const payload = {
        user: {
            id: userId.toString()
        }
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '24h'
    });
}
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured in .env');
}

// ========================================
// REGISTER USER
// ========================================

router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        const db = await connectToDatabase();
        const collection = db.collection('users');

        const existingUser = await collection.findOne({ email });

        if (existingUser) {
            logger.error('Email already exists');

            return res.status(400).json({
                error: 'Email id already exists'
            });
        }

        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(password, salt);

        const newUser = await collection.insertOne({
            email,
            firstName,
            lastName,
            password: hash,
            createdAt: new Date()
        });

        const payload = {
            user: {
                id: newUser.insertedId.toString()
            }
        };

        const authtoken = jwt.sign(payload, JWT_SECRET);

        logger.info('User registered successfully');

        return res.status(201).json({
            authtoken,
            email,
            userName: firstName,
            firstName,
            lastName
        });

    } catch (e) {
        logger.error(e);

        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});

// ========================================
// LOGIN USER
// ========================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        const db = await connectToDatabase();
        const usersCollection = db.collection('users');

        const theUser = await usersCollection.findOne({
            email: email.trim().toLowerCase()
        });

        if (!theUser) {
            logger.error('User not found');

            return res.status(404).json({
                error: 'User not found'
            });
        }

        const passwordMatch = await bcryptjs.compare(
            password,
            theUser.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Incorrect password'
            });
        }

        const authtoken = createToken(theUser._id);

        logger.info('User logged in successfully');

        return res.status(200).json({
            authtoken,
            userName: theUser.firstName,
            userEmail: theUser.email,
            firstName: theUser.firstName,
            lastName: theUser.lastName
        });

    } catch (e) {
        logger.error(e);

        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
});


// ========================================
// UPDATE USER
// ========================================

router.put(
    '/update',
    [
        body('firstName')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('First name cannot be empty'),

        body('lastName')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Last name cannot be empty'),

        body('password')
            .optional()
            .isLength({ min: 6 })
            .withMessage('Password must contain at least 6 characters')
    ],
    async (req, res) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        try {
            // Get email from request header
            const email = req.headers.email;

            if (!email) {
                return res.status(400).json({
                    error: 'Email not found in request headers'
                });
            }

            // Connect to MongoDB
            const db = await connectToDatabase();

            // Access users collection
            const usersCollection = db.collection('users');

            // Find existing user
            const existingUser = await usersCollection.findOne({
                email: email.trim().toLowerCase()
            });

            if (!existingUser) {
                return res.status(404).json({
                    error: 'User not found'
                });
            }

            // Prepare update
            const updateData = {
                updatedAt: new Date()
            };

            if (req.body.firstName) {
                updateData.firstName = req.body.firstName.trim();
            }

            if (req.body.lastName) {
                updateData.lastName = req.body.lastName.trim();
            }

            if (req.body.password) {
                updateData.password = await bcryptjs.hash(
                    req.body.password,
                    10
                );
            }

            // Update user in MongoDB
            await usersCollection.updateOne(
                { _id: existingUser._id },
                { $set: updateData }
            );

            // Generate JWT
            const authtoken = createToken(existingUser._id);

            logger.info('User updated successfully');

            return res.status(200).json({
                message: 'User updated successfully',
                authtoken
            });

        } catch (e) {
            logger.error(e);

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
);
module.exports = router;
