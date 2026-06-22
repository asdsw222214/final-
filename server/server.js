import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDb,
  createGroup,
  getGroup,
  updateGroup,
  addMember,
  updateMember,
  deleteMember,
  checkGroupExists
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize database before starting server
initDb()
  .then(() => {
    console.log('Database initialized successfully.');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// API Routes

// 1. Create group
app.post('/api/groups', async (req, res) => {
  const { name } = req.body;
  try {
    const groupId = await createGroup(name || '未命名小組');
    res.status(201).json({ id: groupId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// 2. Check if group exists
app.get('/api/groups/:id/exists', async (req, res) => {
  const { id } = req.params;
  try {
    const exists = await checkGroupExists(id);
    res.json({ exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check group existence' });
  }
});

// 3. Get group details (periods, members, etc.)
app.get('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const group = await getGroup(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve group data' });
  }
});

// 4. Update group settings
app.put('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  const { name, excludeWeekends, periods } = req.body;
  try {
    const exists = await checkGroupExists(id);
    if (!exists) {
      return res.status(404).json({ error: 'Group not found' });
    }
    await updateGroup(id, { name, excludeWeekends, periods });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update group settings' });
  }
});

// 5. Add a member to a group
app.post('/api/groups/:id/members', async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    const exists = await checkGroupExists(id);
    if (!exists) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const memberId = await addMember(id, name, color);
    res.status(201).json({ id: memberId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// 6. Update member details / schedule
app.put('/api/groups/:id/members/:memberId', async (req, res) => {
  const { memberId } = req.params;
  const { name, color, isActive, busySlots } = req.body;
  try {
    await updateMember(memberId, { name, color, isActive, busySlots });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// 7. Delete a member
app.delete('/api/groups/:id/members/:memberId', async (req, res) => {
  const { memberId } = req.params;
  try {
    await deleteMember(memberId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// Serve static assets from Vue client build
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Serve the index.html for any other requests (Vue Router fallback / SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});
