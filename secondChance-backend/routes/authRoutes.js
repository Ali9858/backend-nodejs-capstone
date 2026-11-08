const express = require('express');
const router = express.Router();

const connectToDatabase = require('../models/db');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const {
    body,
    validationResult
} = require('express-validator');

const logger = require('../logger');


// ========================================
// REGISTER USER
// ========================================

router.post('/register', async (req, res) => {
    try {
        // Task 1: Connect to MongoDB
        const db = await connectToDatabase();

        // Task 2: Access users collection
        const usersCollection = db.collection('users');

        // Task 3: Get user credentials
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                error: 'User already exists'
            });
        }

        // Task 4: Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Task 5: Insert user into database
        const newUser = {
            email,
            password: hashedPassword
        };

        const result = await usersCollection.insertOne(newUser);

        // Task 6: Create JWT token
        const token = jwt.sign(
            { userId: result.insertedId },
            process.env.JWT_SECRET
        );

        // Task 7: Log successful registration
        logger.info(`User registered successfully: ${email}`);

        // Task 8: Return email and token
        res.status(201).json({
            email,
            token
        });

    } catch (e) {
        logger.error('Registration error:', e);

        return res.status(500).send('Internal server error');
    }
});


// ========================================
// LOGIN USER
// ========================================

router.post('/login', async (req, res) => {
    try {
        // Task 1: Connect to MongoDB
        const db = await connectToDatabase();

        // Task 2: Access users collection
        const usersCollection = db.collection('users');

        // Task 3: Find user
        const { email, password } = req.body;

        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Task 4: Compare passwords
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Incorrect password'
            });
        }

        // Task 5: Fetch user details
        const {
            _id,
            userName,
            email: userEmail
        } = user;

        // Task 6: Create JWT token
        const token = jwt.sign(
            { userId: _id },
            process.env.JWT_SECRET
        );

        // Task 7: Return authentication token
        res.json({
            authtoken: token,
            userName,
            userEmail
        });

    } catch (e) {
        logger.error('Login error:', e);

        return res.status(500).send('Internal server error');
    }
});


// ========================================
// UPDATE USER
// ========================================

router.put('/update', [

    // Task 1: Validate input
    body('email').isEmail().normalizeEmail(),
    body('userName').notEmpty(),
    body('password').isLength({ min: 6 })

], async (req, res) => {

    // Task 2: Check validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {
        // Task 3: Get email
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email is required'
            });
        }

        // Task 4: Connect to MongoDB
        const db = await connectToDatabase();

        const usersCollection = db.collection('users');

        // Task 5: Find existing user
        const existingUser = await usersCollection.findOne({ email });

        if (!existingUser) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Hash updated password
        const hashedPassword = await bcrypt.hash(
            req.body.password,
            10
        );

        // Task 6: Update user credentials
        await usersCollection.updateOne(
            { email },
            {
                $set: {
                    userName: req.body.userName,
                    password: hashedPassword,
                    updatedAt: new Date()
                }
            }
        );

        // Task 7: Create JWT token
        const token = jwt.sign(
            { userId: existingUser._id },
            process.env.JWT_SECRET
        );

        res.json({
            authtoken: token
        });

    } catch (e) {
        logger.error('Update error:', e);

        return res.status(500).send('Internal server error');
    }
});


// ========================================
// EXPORT ROUTER
// ========================================

module.exports = router;
