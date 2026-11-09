require('dotenv').config();

const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URL;
const dbName = process.env.MONGO_DB || 'secondChance';

let client;
let dbInstance;

async function connectToDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    if (!url) {
        throw new Error('MONGO_URL is not configured');
    }

    if (!client) {
        client = new MongoClient(url);
    }

    await client.connect();

    dbInstance = client.db(dbName);

    console.log(`Connected to MongoDB database: ${dbName}`);

    return dbInstance;
}

module.exports = connectToDatabase;
