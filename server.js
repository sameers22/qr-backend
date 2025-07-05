require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { CosmosClient } = require('@azure/cosmos');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Cosmos DB setup
const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY,
});
const db = client.database(process.env.COSMOS_DB_DATABASE);
const container = db.container(process.env.COSMOS_DB_CONTAINER);

// ✅ Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// ✅ Test DB
app.get('/api/test-db', async (req, res) => {
  try {
    const querySpec = { query: 'SELECT * FROM c OFFSET 0 LIMIT 1' };
    const { resources } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(resources);
  } catch (err) {
    console.error('❌ DB Test Error:', err.message);
    res.status(500).json({ message: 'Cosmos DB test failed', error: err.message });
  }
});

// ✅ Save Project
app.post('/api/save-project', async (req, res) => {
  try {
    const { name, text, time } = req.body;
    if (!name || !text || !time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newItem = {
      id: `${Date.now()}-${Math.random()}`,
      name,
      text,
      time,
      scanCount: 0, // ✅ initialize tracking
      type: 'qr_project',
    };

    const { resource } = await container.items.create(newItem);
    res.status(201).json({ message: 'Project saved', project: resource });
  } catch (err) {
    console.error('❌ Save Project Error:', err.message);
    res.status(500).json({ message: 'Failed to save project', error: err.message });
  }
});

// ✅ Get All Projects
app.get('/api/get-projects', async (req, res) => {
  try {
    const query = {
      query: 'SELECT * FROM c WHERE c.type = @type ORDER BY c._ts DESC',
      parameters: [{ name: '@type', value: 'qr_project' }],
    };

    const { resources } = await container.items.query(query).fetchAll();
    res.status(200).json({ projects: resources });
  } catch (err) {
    console.error('❌ Fetch Projects Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch projects', error: err.message });
  }
});

// ✅ Delete Project
app.delete('/api/delete-project/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await container.item(id, id).delete();
    res.status(200).json({ message: 'Project deleted' });
  } catch (err) {
    console.error('❌ Delete error:', err.message);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// ✅ Update Project
app.put('/api/update-project/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, text } = req.body;
    if (!name || !text) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const { resource: existing } = await container.item(id, id).read();
    const updated = {
      ...existing,
      name,
      text,
      time: new Date().toISOString(),
    };

    const { resource } = await container.items.upsert(updated);
    res.status(200).json({ message: 'Project updated', project: resource });
  } catch (err) {
    console.error('❌ Update error:', err.message);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// ✅ Track Scans
app.get('/api/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resource: project } = await container.item(id, id).read();

    if (!project || !project.text) {
      return res.status(404).send('QR project not found');
    }

    project.scanCount = (project.scanCount || 0) + 1;

    await container.items.upsert(project);

    // Redirect to actual content
    res.redirect(project.text);
  } catch (err) {
    console.error('❌ Tracking Error:', err.message);
    res.status(500).send('Tracking failed');
  }
});

// ✅ Get Scan Count
app.get('/api/get-scan-count/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resource: project } = await container.item(id, id).read();

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.status(200).json({ scanCount: project.scanCount || 0 });
  } catch (err) {
    console.error('❌ Get Scan Count Error:', err.message);
    res.status(500).json({ message: 'Failed to get scan count' });
  }
});

// 📊 Get project by ID (with scanCount)
app.get('/api/get-project/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { resource } = await container.item(id, id).read();
    res.status(200).json({ project: resource });
  } catch (err) {
    res.status(404).json({ message: 'Project not found' });
  }
});


// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
