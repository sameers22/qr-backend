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

// 🔹 Save Project Route
app.post('/api/save-project', async (req, res) => {
  try {
    const { name, text, time } = req.body;

    if (!name || !text || !time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newItem = {
      id: `${Date.now()}-${Math.random()}`, // unique ID
      name,
      text,
      time,
      type: 'qr_project',
    };

    const { resource } = await container.items.create(newItem);
    res.status(201).json({ message: 'Project saved', project: resource });
  } catch (err) {
    console.error('❌ Save Project Error:', err);
    res.status(500).json({ message: 'Failed to save project' });
  }
});

// 🔹 Get All Projects Route
app.get('/api/get-projects', async (req, res) => {
  try {
    const query = {
      query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c._ts DESC',
      parameters: [{ name: '@type', value: 'qr_project' }],
    };

    const { resources } = await container.items.query(query).fetchAll();
    res.status(200).json({ projects: resources });
  } catch (err) {
    console.error('❌ Fetch Projects Error:', err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
