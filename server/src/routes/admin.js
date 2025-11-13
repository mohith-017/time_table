// server/src/routes/admin.js
import { Router } from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Room from '../models/Room.js';
import Settings from '../models/Settings.js';
import Timetable from '../models/Timetable.js';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { generateTimetable } from '../services/generator.js';

const router = Router();

// All admin routes require ADMIN
router.use(auth, requireRole('ADMIN'));

/* ----------------------------- SETTINGS CRUD ----------------------------- */
// Get settings
router.get('/settings', async (_req, res) => {
  const s = await Settings.findOne();
  res.json(s || { workingDays: [1,2,3,4,5], dayConfig: [] });
});

// Upsert settings
router.put('/settings', async (req, res) => {
  const data = req.body;
  let s = await Settings.findOne();
  if (!s) s = new Settings(data);
  else Object.assign(s, data);
  await s.save();
  res.json(s);
});

/* ------------------------------ COURSES CRUD ----------------------------- */
/**
 * Supports query filter by batch & section
 * GET /admin/courses?batch=BTech2025&section=A
 * Returns populated teacher (name,email)
 */
router.get('/courses', async (req, res) => {
  const { batch, section } = req.query || {};
  const q = {};
  if (batch) q.batch = batch;
  if (section) q.section = section;

  const items = await Course.find(q)
    .sort({ code: 1 })
    .populate('teacher', 'name email');
  res.json(items);
});

/**
 * Safe create:
 * - requires code, name, batch, section
 * - accepts type ('LECTURE'|'LAB'), hoursPerWeek
 * - ONLY sets teacher if non-empty string is provided
 */
router.post('/courses', async (req, res) => {
  try {
    const { code, name, type = 'LECTURE', teacher, batch, section, hoursPerWeek = 4 } = req.body;

    if (!code || !name || !batch || !section) {
      return res.status(400).json({ message: 'code, name, batch, section are required' });
    }

    const payload = {
      code: String(code).trim(),
      name: String(name).trim(),
      type: type === 'LAB' ? 'LAB' : 'LECTURE',
      batch: String(batch).trim(),
      section: String(section).trim(),
      hoursPerWeek: Number(hoursPerWeek) || 0,
    };

    // Only set teacher if provided (avoid ObjectId cast on "")
    if (teacher) payload.teacher = teacher;

    const c = await Course.create(payload);
    res.status(201).json(c);
  } catch (err) {
    console.error('Course create error:', err);
    res.status(500).json({ message: 'Server error creating course' });
  }
});

/**
 * Safe update (coerces hoursPerWeek to number; ignores empty teacher)
 */
router.put('/courses/:id', async (req, res) => {
  const { id } = req.params;
  const body = { ...req.body };

  if (body.hoursPerWeek != null) {
    body.hoursPerWeek = Number(body.hoursPerWeek) || 0;
  }
  if ('teacher' in body && !body.teacher) {
    // If client sends empty string, remove teacher field instead of casting ""
    delete body.teacher;
  }

  const c = await Course.findByIdAndUpdate(id, body, { new: true });
  if (!c) return res.status(404).json({ message: 'Course not found' });
  res.json(c);
});

router.delete('/courses/:id', async (req, res) => {
  const { id } = req.params;
  await Course.findByIdAndDelete(id);
  res.json({ ok: true });
});

/* -------------------------------- ROOMS CRUD ----------------------------- */
router.get('/rooms', async (_req, res) => {
  const items = await Room.find().sort({ name: 1 });
  res.json(items);
});

router.post('/rooms', async (req, res) => {
  const r = await Room.create(req.body);
  res.status(201).json(r);
});

router.put('/rooms/:id', async (req, res) => {
  const { id } = req.params;
  const r = await Room.findByIdAndUpdate(id, req.body, { new: true });
  if (!r) return res.status(404).json({ message: 'Room not found' });
  res.json(r);
});

router.delete('/rooms/:id', async (req, res) => {
  const { id } = req.params;
  await Room.findByIdAndDelete(id);
  res.json({ ok: true });
});

/* --------------------------- TEACHERS (simple) --------------------------- */
// List teachers
router.get('/teachers', async (_req, res) => {
  const teachers = await User.find({ role: 'TEACHER' })
    .select('_id name email role teacher');
  res.json(teachers);
});

// server/src/routes/admin.js (replace the POST /teachers handler with the block below)

// Create teacher (server sets default password unless provided)
router.post('/teachers', async (req, res) => {
  try {
    const { name, email, skills = [], maxLoadPerDay = 6, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'name and email are required' });
    }

    // ensure unique email
    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const userPayload = {
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: password ? String(password) : 'pass123', // will be hashed by User model pre-save
      role: 'TEACHER',
      teacher: {
        skills: Array.isArray(skills) ? skills : [],
        maxLoadPerDay: Number(maxLoadPerDay) || 6,
        unavailable: []
      }
    };

    const user = await User.create(userPayload);
    // return minimal info
    res.status(201).json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    console.error('Create teacher error:', err);
    res.status(500).json({ message: 'Server error creating teacher' });
  }
});


// Delete teacher
router.delete('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const user = await User.findOneAndDelete({ _id: id, role: 'TEACHER' });
  if (!user) return res.status(404).json({ message: 'Teacher not found' });
  res.json({ ok: true });
});

/* ----------------------------- USERS (optional) -------------------------- */
/**
 * Optional helper to stop 404s you saw for /admin/users in logs.
 * Supports ?role=TEACHER|STUDENT|ADMIN (optional)
 */
router.get('/users', async (req, res) => {
  const { role } = req.query || {};
  const q = {};
  if (role) q.role = role;
  const users = await User.find(q).select('_id name email role');
  res.json(users);
});

/* ------------------------- CLASSES (batch/section) ----------------------- */
/**
 * Provides a lightweight "classes" API so client can list/add/remove semester/section combos.
 *
 * - GET  /admin/classes            => [{ batch, section, semester? }]
 * - POST /admin/classes  { batch, section }  => create empty Timetable doc
 * - DELETE /admin/classes?batch=...&section=... => delete timetable/class
 *
 * Note: supports both `batch` (legacy) and `semester` (frontend may send semester).
 * When returning classes we prefer to return { batch, section } where batch is taken
 * from timetable.batch or timetable.semester for compatibility.
 */

// GET distinct classes (from Timetable collection)
router.get('/classes', async (_req, res) => {
  try {
    const rows = await Timetable.find().select('batch section semester -_id').lean();
    const seen = new Set();
    const classes = [];
    for (const r of rows) {
      // support documents that might store 'semester' field instead of 'batch'
      const batchVal = r.batch || r.semester || '';
      const sectionVal = r.section || '';
      const key = `${batchVal}||${sectionVal}`;
      if (!seen.has(key)) {
        seen.add(key);
        classes.push({ batch: batchVal, semester: batchVal, section: sectionVal });
      }
    }
    res.json(classes);
  } catch (err) {
    console.error('Get classes error:', err);
    res.status(500).json({ message: 'Server error fetching classes' });
  }
});

// POST create a class (creates an empty Timetable doc)
// Accepts { batch, section } or { semester, section }
router.post('/classes', async (req, res) => {
  try {
    const bodyBatch = req.body.batch || req.body.semester;
    const batch = bodyBatch ? String(bodyBatch).trim() : '';
    const section = req.body.section ? String(req.body.section).trim() : '';

    if (!batch || !section) return res.status(400).json({ message: 'batch (or semester) and section are required' });

    // check if a Timetable already exists for this pair
    const exists = await Timetable.findOne({ $or: [{ batch }, { semester: batch }], section });
    if (exists) return res.status(409).json({ message: 'Class already exists' });

    const tt = await Timetable.create({ batch, semester: batch, section, grid: [] });
    res.status(201).json(tt);
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ message: 'Server error creating class' });
  }
});

// DELETE remove a class by query params ?batch=...&section=... (also accepts semester param)
router.delete('/classes', async (req, res) => {
  try {
    const qBatch = req.query.batch || req.query.semester;
    const batch = qBatch ? String(qBatch).trim() : '';
    const section = req.query.section ? String(req.query.section).trim() : '';
    if (!batch || !section) return res.status(400).json({ message: 'batch (or semester) and section required' });

    const removed = await Timetable.findOneAndDelete({ $or: [{ batch }, { semester: batch }], section });
    if (!removed) return res.status(404).json({ message: 'Class not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete class error:', err);
    res.status(500).json({ message: 'Server error deleting class' });
  }
});

/* ------------------------- TIMETABLE: GENERATE/GET ----------------------- */
// Generate timetable for a batch/section using generator service
router.post('/generate', async (req, res) => {
  // Accept both batch or semester from client (frontend may use "semester")
  const batch = req.body.batch || req.body.semester;
  const section = req.body.section;
  if (!batch || !section) {
    return res.status(400).json({ message: 'batch (or semester) and section are required' });
  }
  try {
    const result = await generateTimetable({ batch, section });
    res.json(result);
  } catch (err) {
    console.error('Generate timetable error:', err);
    res.status(500).json({ message: 'Server error generating timetable' });
  }
});

// Optional: get raw timetable list (admin-wide)
router.get('/timetables', async (_req, res) => {
  const tts = await Timetable.find().sort({ createdAt: -1 }).limit(50);
  res.json(tts);
});

export default router;
