
require('dotenv').config();

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const url = process.env.MONGO_URL;
const dbName = process.env.MONGO_DB || 'secondChance';
const collectionName = process.env.MONGO_COLLECTION || 'secondChanceItems';

const filename = path.join(__dirname, 'secondChanceItems.json');

const data = JSON.parse(
    fs.readFileSync(filename, 'utf8')
).docs;

async function loadData() {
    const client = new MongoClient(url);

    try {
        await client.connect();
        console.log('Connected successfully to server');

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const documentsCount = await collection.countDocuments();

        if (documentsCount === 0) {
            const result = await collection.insertMany(data);

            console.log('Inserted documents:', result.insertedCount);
        } else {
            console.log('Items already exist in DB:', documentsCount);
        }

    } catch (err) {
        console.error('Import error:', err);
        throw err;
    } finally {
        await client.close();
    }
}

if (require.main === module) {
    loadData().catch(err => {
        console.error(err);
        process.exitCode = 1;
    });
}

module.exports = { loadData };
