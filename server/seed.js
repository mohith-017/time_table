// seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { config } from './src/config.js';
import User from './src/models/User.js';
import Room from './src/models/Room.js';
import Course from './src/models/Course.js';
import Settings from './src/models/Settings.js';

dotenv.config();

async function run() {
  await mongoose.connect(config.mongoUri);

  await Promise.all([
    User.deleteMany({}),
    Room.deleteMany({}),
    Course.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  // Base settings: Mon–Fri, 6 periods/day, tea after P2, lunch after P4
  await Settings.create({
    workingDays: [1, 2, 3, 4, 5],
    dayConfig: [1, 2, 3, 4, 5].map(d => ({
      day: d,
      start: '09:00',
      end: '17:00',
      periodMinutes: 60,
      periods: 6,
      teaBreak: { startPeriod: 2, length: 1 },
      lunchBreak: { startPeriod: 4, length: 1 },
    })),
  });

  // Users
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'ADMIN',
  });

  const t1 = await User.create({
    name: 'Dr. Rao',
    email: 'rao@example.com',
    password: 'pass123',
    role: 'TEACHER',
    teacher: { skills: ['CS101'] },
  });

  const t2 = await User.create({
    name: 'Prof. Lee',
    email: 'lee@example.com',
    password: 'pass123',
    role: 'TEACHER',
    teacher: { skills: ['CS102'] },
  });

  await User.create({
    name: 'Alice',
    email: 'alice@example.com',
    password: 'pass123',
    role: 'STUDENT',
    student: { batch: 'BTech2025', section: 'A' },
  });

  // Rooms
  await Room.insertMany([
    { name: 'R101', capacity: 60, type: 'LECTURE' },
    { name: 'R102', capacity: 60, type: 'LECTURE' },
    { name: 'Lab1', capacity: 30, type: 'LAB' },
  ]);

  // Courses
  await Course.insertMany([
    {
      code: 'CS101',
      name: 'Intro to CS',
      hoursPerWeek: 4,
      type: 'LECTURE',
      batch: 'BTech2025',
      section: 'A',
      teacher: t1._id,
    },
    {
      code: 'CS102',
      name: 'Data Structures Lab',
      hoursPerWeek: 2,
      type: 'LAB',
      batch: 'BTech2025',
      section: 'A',
      teacher: t2._id,
    },
  ]);

  console.log('Seeded. Admin login: admin@example.com / admin123');
  process.exit(0);
}

run();
