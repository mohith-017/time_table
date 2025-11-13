// server/createUserOnce.mjs
// Usage: node createUserOnce.mjs
import mongoose from 'mongoose';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// adjust MONGO URL if you use env file
const MONGO = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/class-timetable';

async function run() {
  console.log('Connecting to', MONGO);
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

  // load User model (adjust path if your files live elsewhere)
  const User = (await import(path.join(__dirname, 'src/models/User.js'))).default;

  // helper to upsert user
  async function upsertUser({ email, name, password, role, student, teacher }) {
    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      console.log('User exists, skipping:', email);
      return existing;
    }
    const u = new User({
      name,
      email: String(email).toLowerCase().trim(),
      password,
      role,
      student: student || undefined,
      teacher: teacher || undefined
    });
    await u.save();
    console.log('Created user:', email, 'role:', role, 'id:', u._id.toString());
    return u;
  }

  try {
    await upsertUser({ email: 'admin@example.com', name: 'Site Admin', password: 'admin123', role: 'ADMIN' });
    await upsertUser({ email: 'teacher@example.com', name: 'Teacher One', password: 'teach123', role: 'TEACHER', teacher: { skills: [], maxLoadPerDay: 6 } });
    await upsertUser({ email: 'student@example.com', name: 'Student One', password: 'stud123', role: 'STUDENT', student: { batch: '5', section: 'B' } });
    console.log('Done. You can now login with admin@example.com/admin123, teacher@example.com/teach123, student@example.com/stud123');
  } catch (err) {
    console.error('Error creating users:', err && err.stack ? err.stack : err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
