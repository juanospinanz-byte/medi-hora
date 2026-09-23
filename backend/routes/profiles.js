const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// Get all profiles for the logged-in user
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new profile
router.post('/', async (req, res) => {
  const { name, photo, birthdate, type } = req.body;
  
  if (!name || !birthdate || !type) {
    return res.status(400).json({ error: 'Name, birthdate and type are required' });
  }
  
  if (!['adulto mayor', 'niño', 'adulto'].includes(type)) {
    return res.status(400).json({ error: 'Invalid profile type' });
  }

  try {
    // Check limit
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM profiles WHERE user_id = ?', [req.user.userId]);
    if (countRows[0].count >= 10) {
      return res.status(400).json({ error: 'Maximum of 10 profiles allowed per account' });
    }

    const [result] = await pool.query(
      'INSERT INTO profiles (user_id, name, photo, birthdate, type) VALUES (?, ?, ?, ?, ?)',
      [req.user.userId, name, photo || null, birthdate, type]
    );
    res.status(201).json({ message: 'Profile created successfully', profileId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update a profile
router.put('/:id', async (req, res) => {
  const profileId = req.params.id;
  const { name, photo, birthdate, type } = req.body;

  try {
    // Check if profile belongs to user
    const [check] = await pool.query('SELECT id FROM profiles WHERE id = ? AND user_id = ?', [profileId, req.user.userId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await pool.query(
      'UPDATE profiles SET name = COALESCE(?, name), photo = COALESCE(?, photo), birthdate = COALESCE(?, birthdate), type = COALESCE(?, type) WHERE id = ?',
      [name, photo, birthdate, type, profileId]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a profile
router.delete('/:id', async (req, res) => {
  const profileId = req.params.id;

  try {
    // Check if profile belongs to user
    const [check] = await pool.query('SELECT id FROM profiles WHERE id = ? AND user_id = ?', [profileId, req.user.userId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await pool.query('DELETE FROM profiles WHERE id = ?', [profileId]);
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;