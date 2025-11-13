// routes/student.js
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import Timetable from '../models/Timetable.js';

const router = Router();

// Student-only routes
router.use(auth, authorize('STUDENT'));

// Basic profile echo
router.get('/me', async (req, res) => {
  res.json(req.user);
});

// Student's class timetable (by batch/section on the user record)
router.get('/me/timetable', async (req, res) => {
  const { batch, section } = req.user.student || {};
  if (!batch || !section) {
    return res.status(400).json({ message: 'Student batch/section missing' });
  }
  const tt = await Timetable.findOne({ batch, section }).populate('grid.course grid.room');
  res.json(tt || { grid: [] });
});

export default router;
