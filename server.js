require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { CosmosClient } = require('@azure/cosmos');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔹 Cosmos DB Client Setup
const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY,
});

const db = client.database(process.env.COSMOS_DB_DATABASE);
const container = db.container(process.env.COSMOS_DB_CONTAINER);

// 🔹 Test DB Connection Route
app.get('/api/test-db', async (req, res) => {
  try {
    const querySpec = { query: 'SELECT * FROM c OFFSET 0 LIMIT 1' };
    const { resources } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(resources);
  } catch (err) {
    console.error('❌ DB Test Error:', err);
    res.status(500).json({ message: 'Cosmos DB test failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
