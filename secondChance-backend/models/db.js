require('dotenv').config();

const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URL;
const dbName = process.env.MONGO_DB;

let dbInstance = null;
let client = null;

async function connectToDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    if (!url || !dbName) {
        throw new Error('MONGO_URL or MONGO_DB is not configured');
    }

    client = new MongoClient(url);

    await client.connect();

    console.log(`Connected to MongoDB database: ${dbName}`);

    dbInstance = client.db(dbName);

    return dbInstance;
}

module.exports = connectToDatabase;
