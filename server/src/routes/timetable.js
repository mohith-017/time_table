// server/src/routes/timetable.js  (DIAGNOSTIC VERSION)
import { Router } from 'express';
import Timetable from '../models/Timetable.js';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// Basic GET - tolerant lookup (tries batch OR semester)
router.get('/', async (req, res) => {
  try {
    const qBatch = req.query.batch || req.query.semester || '';
    const section = req.query.section || req.query.sec || '';

    console.log('[timetable] GET / - query:', req.query);

    if (!qBatch || !section) {
      return res.status(400).json({ message: 'Missing query. Provide batch (or semester) and section. Example: /api/timetable?batch=5&section=B' });
    }

    const doc = await Timetable.findOne({
      $and: [
        { section },
        { $or: [{ batch: qBatch }, { semester: qBatch }, { batch: `Semester ${qBatch}` }, { semester: `Semester ${qBatch}` }] }
      ]
    }).lean();

    if (!doc) {
      // helpful debug message
      console.warn('[timetable] not found for:', { qBatch, section });
      return res.status(404).json({ message: 'Timetable not found for given batch/semester & section' });
    }

    console.log('[timetable] found doc id:', doc._id, 'batch/semester:', doc.batch, doc.semester);
    return res.json(doc);
  } catch (err) {
    console.error('GET /api/timetable error:', err);
    return res.status(500).json({ message: 'Server error retrieving timetable' });
  }
});

// Diagnostic route: return any docs that *could* match (useful to see how DB values are stored)
router.get('/diag', async (req, res) => {
  try {
    const qBatch = req.query.batch || req.query.semester || '';
    const section = req.query.section || req.query.sec || '';
    console.log('[timetable] GET /diag - query:', req.query);

    if (!qBatch && !section) {
      // return a few docs so you can inspect how they look
      const sample = await Timetable.find().limit(10).lean();
      return res.json({ note: 'sample documents (no query provided)', sample });
    }

    // Build flexible OR clauses to check how values are stored
    const orClauses = [];
    if (qBatch) {
      orClauses.push({ batch: qBatch }, { semester: qBatch }, { batch: `Semester ${qBatch}` }, { semester: `Semester ${qBatch}` });
    }
    if (section) orClauses.push({ section });

    const docs = await Timetable.find({ $or: orClauses }).limit(50).lean();
    console.log(`[timetable/diag] found ${docs.length} docs matching OR clauses`, orClauses);
    return res.json({ matched: docs.length, docs });
  } catch (err) {
    console.error('GET /api/timetable/diag error:', err);
    return res.status(500).json({ message: 'Server error (diag)' });
  }
});

// convenience route: GET /api/timetable/:batch/:section
router.get('/:batch/:section', async (req, res) => {
  try {
    const { batch, section } = req.params;
    console.log('[timetable] GET /:batch/:section', req.params);
    if (!batch || !section) return res.status(400).json({ message: 'batch and section required' });

    const doc = await Timetable.findOne({
      $and: [
        { section },
        { $or: [{ batch }, { semester: batch }, { batch: `Semester ${batch}` }, { semester: `Semester ${batch}` }] }
      ]
    }).lean();

    if (!doc) return res.status(404).json({ message: 'Timetable not found' });
    return res.json(doc);
  } catch (err) {
    console.error('GET /api/timetable/:batch/:section error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// admin-only listing
router.get('/admin/list', auth, requireRole('ADMIN'), async (_req, res) => {
  try {
    const docs = await Timetable.find().sort({ updatedAt: -1 }).limit(100).lean();
    return res.json(docs);
  } catch (err) {
    console.error('GET /api/timetable/admin/list error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
