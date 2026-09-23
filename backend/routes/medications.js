const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

const VALID_FREQUENCIES = ['diaria', 'semanal', 'dias_alternos', 'cada_x_horas', 'dias_especificos'];

// Helper to normalize times array
const parseTimes = (times) => {
  if (Array.isArray(times)) return times;
  if (typeof times === 'string') {
    try {
      return JSON.parse(times);
    } catch {
      return [times];
    }
  }
  return [];
};

// GET /api/medications - Get all medications for the user or filtered by profile_id
router.get('/', async (req, res) => {
  const { profile_id } = req.query;

  try {
    let query = `
      SELECT m.*, p.name AS profile_name, p.photo AS profile_photo
      FROM medications m
      JOIN profiles p ON m.profile_id = p.id
      WHERE m.user_id = ?
    `;
    const params = [req.user.userId];

    if (profile_id) {
      query += ' AND m.profile_id = ?';
      params.push(profile_id);
    }

    query += ' ORDER BY m.created_at DESC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((item) => ({
      ...item,
      times: parseTimes(item.times),
      start_date: item.start_date ? item.start_date.toISOString().split('T')[0] : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/medications/:id - Get specific medication
router.get('/:id', async (req, res) => {
  const medicationId = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT m.*, p.name AS profile_name, p.photo AS profile_photo
       FROM medications m
       JOIN profiles p ON m.profile_id = p.id
       WHERE m.id = ? AND m.user_id = ?`,
      [medicationId, req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    const item = rows[0];
    res.json({
      ...item,
      times: parseTimes(item.times),
      start_date: item.start_date ? item.start_date.toISOString().split('T')[0] : null,
    });
  } catch (error) {
    console.error('Error fetching medication:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/medications - Create a new dose reminder
router.post('/', async (req, res) => {
  const {
    profile_id,
    medication_name,
    dose,
    frequency_type,
    frequency_value,
    times,
    start_date,
    photo,
    notes,
  } = req.body;

  if (!profile_id || !medication_name || !dose || !frequency_type) {
    return res.status(400).json({
      error: 'profile_id, medication_name, dose, y frequency_type son obligatorios',
    });
  }

  if (!VALID_FREQUENCIES.includes(frequency_type)) {
    return res.status(400).json({
      error: `Frecuencia inválida. Opciones válidas: ${VALID_FREQUENCIES.join(', ')}`,
    });
  }

  const parsedTimes = parseTimes(times);
  if (!parsedTimes || parsedTimes.length === 0) {
    return res.status(400).json({
      error: 'Debes añadir al menos un horario de toma',
    });
  }

  try {
    // Check if profile belongs to user
    const [profileCheck] = await pool.query(
      'SELECT id FROM profiles WHERE id = ? AND user_id = ?',
      [profile_id, req.user.userId]
    );

    if (profileCheck.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado o no autorizado' });
    }

    const resolvedStartDate = start_date || new Date().toISOString().split('T')[0];
    const resolvedFrequencyValue = frequency_value
      ? typeof frequency_value === 'object'
        ? JSON.stringify(frequency_value)
        : String(frequency_value)
      : null;

    const [result] = await pool.query(
      `INSERT INTO medications (
        user_id, profile_id, medication_name, dose, frequency_type,
        frequency_value, times, start_date, photo, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        profile_id,
        medication_name.trim(),
        dose.trim(),
        frequency_type,
        resolvedFrequencyValue,
        JSON.stringify(parsedTimes),
        resolvedStartDate,
        photo || null,
        notes ? notes.trim() : null,
      ]
    );

    res.status(201).json({
      message: 'Recordatorio de dosis programado exitosamente',
      medicationId: result.insertId,
    });
  } catch (error) {
    console.error('Error creating medication reminder:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/medications/:id - Update medication
router.put('/:id', async (req, res) => {
  const medicationId = req.params.id;
  const {
    profile_id,
    medication_name,
    dose,
    frequency_type,
    frequency_value,
    times,
    start_date,
    photo,
    notes,
  } = req.body;

  try {
    // Check if medication belongs to user
    const [check] = await pool.query(
      'SELECT id FROM medications WHERE id = ? AND user_id = ?',
      [medicationId, req.user.userId]
    );

    if (check.length === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    if (frequency_type && !VALID_FREQUENCIES.includes(frequency_type)) {
      return res.status(400).json({ error: 'Frecuencia inválida' });
    }

    const resolvedFrequencyValue = frequency_value !== undefined
      ? (typeof frequency_value === 'object' ? JSON.stringify(frequency_value) : String(frequency_value))
      : undefined;

    await pool.query(
      `UPDATE medications SET
        profile_id = COALESCE(?, profile_id),
        medication_name = COALESCE(?, medication_name),
        dose = COALESCE(?, dose),
        frequency_type = COALESCE(?, frequency_type),
        frequency_value = COALESCE(?, frequency_value),
        times = COALESCE(?, times),
        start_date = COALESCE(?, start_date),
        photo = COALESCE(?, photo),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?`,
      [
        profile_id || null,
        medication_name ? medication_name.trim() : null,
        dose ? dose.trim() : null,
        frequency_type || null,
        resolvedFrequencyValue !== undefined ? resolvedFrequencyValue : null,
        times ? JSON.stringify(parseTimes(times)) : null,
        start_date || null,
        photo !== undefined ? photo : null,
        notes !== undefined ? notes : null,
        medicationId,
        req.user.userId,
      ]
    );

    res.json({ message: 'Recordatorio actualizado correctamente' });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/medications/:id - Delete medication
router.delete('/:id', async (req, res) => {
  const medicationId = req.params.id;

  try {
    const [check] = await pool.query(
      'SELECT id FROM medications WHERE id = ? AND user_id = ?',
      [medicationId, req.user.userId]
    );

    if (check.length === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    await pool.query('DELETE FROM medications WHERE id = ?', [medicationId]);
    res.json({ message: 'Recordatorio eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
