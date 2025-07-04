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

// 🔹 Save or update QR customization only
app.post('/api/customize', async (req, res) => {
  const { name, text, qrColor, bgColor } = req.body;

  if (!name || !text) {
    return res.status(400).json({ message: 'Name and text required.' });
  }

  try {
    const { resource } = await container.items.upsert({
      id: name, // use project name as unique ID
      name,
      text,
      qrColor,
      bgColor,
    });
    res.status(200).json(resource);
  } catch (err) {
    console.error('Error saving customization:', err);
    res.status(500).json({ message: 'Failed to save customization' });
  }
});

// 🔹 Get customization by project name
app.get('/api/customize/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const { resource } = await container.item(name, name).read();
    res.status(200).json(resource);
  } catch (err) {
    res.status(404).json({ message: 'Customization not found' });
  }
});

// 🔹 Save complete QR project (name, text, time, color)
app.post('/api/save-project', async (req, res) => {
  const { name, text, time, qrColor, bgColor } = req.body;

  if (!name || !text || !time) {
    return res.status(400).json({ message: 'Missing name, text, or time' });
  }

  try {
    const project = {
      id: name, // project name as unique ID (can switch to uuid if needed)
      name,
      text,
      time,
      qrColor: qrColor || '#000000',
      bgColor: bgColor || '#ffffff',
    };

    const { resource } = await container.items.upsert(project);
    res.status(201).json(resource);
  } catch (err) {
    console.error('Error saving project:', err);
    res.status(500).json({ message: 'Failed to save project' });
  }
});

// 🔹 Get a saved project by name
app.get('/api/save-project/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const { resource } = await container.item(name, name).read();
    res.status(200).json(resource);
  } catch (err) {
    res.status(404).json({ message: 'Project not found' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
