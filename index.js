const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { open } = require('sqlite');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');


const app = express();
const PORT = 3008;
const JWT_SECRET = 'TODOS';

const dbPath = path.join(__dirname, 'psNotes.db');
let db = null;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize Database and Server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Create tables after establishing DB connection
    await createTables(db);

    app.listen(PORT, () => {
      console.log(`Server Running at http://localhost:${PORT}/`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();


const createTables = async (db) => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT DEFAULT 'Others',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  };
  

  app.post('/notes', async (req, res) => {
    const { title, description, category = 'Others' } = req.body;
  
    if (!title || !description) {
      return res.status(400).send({ error: 'Title and description are required.' });
    }
  
    const validCategories = ['Work', 'Personal', 'Others'];
    if (!validCategories.includes(category)) {
      return res.status(400).send({ error: 'Invalid category.' });
    }
  
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
  
    try {
      await db.run(
        `INSERT INTO notes (id, title, description, category, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, title, description, category, createdAt, updatedAt]
      );
      res.status(201).send({ message: 'Note created successfully.', id });
    } catch (error) {
      res.status(500).send({ error: 'Error creating note.' });
    }
  });
  
  app.get('/notes', async (req, res) => {
    const { search = '', category = '' } = req.query;
  
    let query = `SELECT * FROM notes WHERE 1 = 1`;
    const params = [];
  
    if (search) {
      query += ` AND (title LIKE ? OR category LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
  
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
  
    query += ` ORDER BY created_at DESC`;
  
    try {
      const notes = await db.all(query, params);
      res.send(notes);
    } catch (error) {
      res.status(500).send({ error: 'Error fetching notes.' });
    }
  });

  app.put('/notes/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, category } = req.body;
  
    if (!title || !description) {
      return res.status(400).send({ error: 'Title and description are required.' });
    }
  
    const validCategories = ['Work', 'Personal', 'Others'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).send({ error: 'Invalid category.' });
    }
  
    const updatedAt = new Date().toISOString();
  
    try {
      const result = await db.run(
        `UPDATE notes SET title = ?, description = ?, category = ?, updated_at = ? WHERE id = ?`,
        [title, description, category || 'Others', updatedAt, id]
      );
  
      if (result.changes === 0) {
        return res.status(404).send({ error: 'Note not found.' });
      }
  
      res.send({ message: 'Note updated successfully.' });
    } catch (error) {
      res.status(500).send({ error: 'Error updating note.' });
    }
  });

  app.delete('/notes/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await db.run(`DELETE FROM notes WHERE id = ?`, id);
  
      if (result.changes === 0) {
        return res.status(404).send({ error: 'Note not found.' });
      }
  
      res.send({ message: 'Note deleted successfully.' });
    } catch (error) {
      res.status(500).send({ error: 'Error deleting note.' });
    }
  });
  