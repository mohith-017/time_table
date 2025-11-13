// server/src/routes/teacher.js
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import User from '../models/User.js';
import Timetable from '../models/Timetable.js';

const router = Router();

// All teacher routes require TEACHER
router.use(auth, requireRole('TEACHER'));

// Get my profile
router.get('/me', async (req, res) => {
  const me = await User.findById(req.user.id).select('-password');
  res.json(me);
});

// Update my unavailable periods (array of { day, period })
router.put('/unavailable', async (req, res) => {
  const { unavailable } = req.body;
  if (!Array.isArray(unavailable)) {
    return res.status(400).json({ message: 'unavailable must be an array' });
  }
  const me = await User.findById(req.user.id);
  if (!me) return res.status(404).json({ message: 'User not found' });
  me.teacher = me.teacher || {};
  me.teacher.unavailable = unavailable;
  await me.save();
  res.json({ ok: true });
});

// Get my timetable (aggregate view)
router.get('/timetable', async (req, res) => {
  const slots = await Timetable.find({ 'grid.teacher': req.user.id })
    .select('batch section grid')
    .lean();

  // Flatten to a lighter view for the teacher UI
  const result = [];
  for (const t of slots) {
    for (const s of t.grid || []) {
      if (String(s.teacher) === String(req.user.id)) {
        result.push({
          batch: t.batch,
          section: t.section,
          day: s.day,
          period: s.period,
          course: s.course,
          room: s.room
        });
      }
    }
  }
  res.json(result);
});

export default router;
