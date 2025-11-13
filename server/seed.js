// server/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { config } from './src/config.js';
import User from './src/models/User.js';
import Room from './src/models/Room.js';
import Course from './src/models/Course.js';
import Settings from './src/models/Settings.js';

dotenv.config();

/**
 * --- Helper Function to Create Teachers ---
 * Ensures teachers are created with the 'TEACHER' role.
 * Returns a Map of { name: user_id } for easy linking.
 */
async function createTeachers(teacherNames) {
  const teacherMap = new Map();
  
  // Base admin user
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'ADMIN',
  });
  console.log('Created Admin: admin@example.com / admin123');
  
  // Create all teachers from the list
  for (const name of teacherNames) {
    const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;
    const user = await User.create({
      name,
      email,
      password: 'pass123', // All teachers get a default password
      role: 'TEACHER',
      teacher: { skills: [], maxLoadPerDay: 6, unavailable: [] },
    });
    teacherMap.set(name, user._id);
  }
  return teacherMap;
}

/**
 * --- Helper Function to Create Rooms ---
 * Creates all rooms from the list.
 * Returns a Map of { name: room_id }
 */
async function createRooms(roomData) {
  const roomMap = new Map();
  for (const { name, type } of roomData) {
    const room = await Room.create({
      name,
      type: type || 'LECTURE', // Default to LECTURE
      capacity: type === 'LAB' ? 30 : 60,
    });
    roomMap.set(name, room._id);
  }
  return roomMap;
}

/**
 * --- Main Seed Function ---
 */
async function run() {
  await mongoose.connect(config.mongoUri);

  // 1. Clear all existing data
  console.log('Clearing existing data (Users, Rooms, Courses, Settings)...');
  await Promise.all([
    User.deleteMany({}),
    Room.deleteMany({}),
    Course.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  // 2. Define our Class
  const BATCH_NAME = '5th Sem';
  const SECTION_NAME = 'B';

  // 3. Create Teachers
  // (Based on the faculty list in the image)
  const teacherNames = [
    'Vinutha K',
    'Dr. Shantha Kumar H C',
    'Dr. Ajay B N',
    'Dhananjaya M',
    'Dr. Prakruthi M K',
    'Kavya G',
    'Dr. Banu Prakash',
    'Lochan Gowda M',
    'Chetana K N',
    'Dr. Arun Kumar D R',
    'Srinidhi K S',
  ];
  const teachers = await createTeachers(teacherNames);

  // 4. Create Rooms
  // (Based on room names in the image)
  const roomData = [
    { name: '301', type: 'LECTURE' },
    { name: 'LH-301', type: 'LECTURE' },
    { name: 'LH-302', type: 'LECTURE' },
    { name: 'Sutherland and Lee Lab - 2', type: 'LAB' },
    { name: 'Bellmen Ford Lab - 02', type: 'LAB' },
    { name: 'Alan Turing Lab - 03', type: 'LAB' },
    { name: 'Charles Babbage Lab - 02', type: 'LAB' },
    { name: 'Alan Turing Lab - 2', type: 'LAB' },
  ];
  const rooms = await createRooms(roomData);

  // 5. Create Courses for the Class
  // (Simplified from the grid - 1 course for the *entire* section)
  await Course.insertMany([
    // CN
    { code: '23CST501', name: 'CN', type: 'LECTURE', hoursPerWeek: 3, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Vinutha K') },
    { code: '23CSL504', name: 'CN Lab', type: 'LAB', hoursPerWeek: 2, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Vinutha K') },
    // SE&PM
    { code: '23CSI502', name: 'SE&PM', type: 'LECTURE', hoursPerWeek: 4, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Dr. Shantha Kumar H C') },
    { code: '23CSL502', name: 'SE&PM Lab', type: 'LAB', hoursPerWeek: 2, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Lochan Gowda M') },
    // DBMS
    { code: '23CSI503', name: 'DBMS', type: 'LECTURE', hoursPerWeek: 3, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Dr. Ajay B N') },
    { code: '23CSL503', name: 'DBMS Lab', type: 'LAB', hoursPerWeek: 2, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Dr. Ajay B N') },
    // Electives
    { code: '23CSP512', name: 'A. JAVA (PE)', type: 'LECTURE', hoursPerWeek: 2, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Dhananjaya M') },
    { code: '23CSE532', name: 'DVT (ETC)', type: 'LECTURE', hoursPerWeek: 4, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Dr. Prakruthi M K') }, // Simplified DVT/React
    // Misc
    { code: '23SFH106', name: 'Bioscience', type: 'LECTURE', hoursPerWeek: 2, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Dr. Banu Prakash') },
    { code: '23CSAE52', name: 'CC Lab', type: 'LAB', hoursPerWeek: 2, batch: BATCH_NAME, section: SECTION_NAME, teacher: teachers.get('Srinidhi K S') },
    { code: 'HRD', name: 'HRD', type: 'LECTURE', hoursPerWeek: 1, batch: BATCH_NAME, section: SECTION_NAME },
    { code: 'LIB', name: 'Library', type: 'LECTURE', hoursPerWeek: 2, batch: BATCH_NAME, section: SECTION_NAME },
    { code: 'PBL', name: 'PBL/ABL', type: 'LECTURE', hoursPerWeek: 3, batch: BATCH_NAME, section: SECTION_NAME },
    { code: 'SPORTS', name: 'Sports/Cultural', type: 'LECTURE', hoursPerWeek: 1, batch: BATCH_NAME, section: SECTION_NAME },
  ]);

  // 6. Create the Settings
  // (Based on the timetable grid structure: Mon-Sat, 7 periods, breaks after P2 and P4)
  const WORKING_DAYS = [1, 2, 3, 4, 5, 6]; // 1=Mon, 6=Sat
  await Settings.create({
    workingDays: WORKING_DAYS,
    dayConfig: WORKING_DAYS.map(d => ({
      day: d,
      start: '08:30',
      end: '16:30',
      periodMinutes: 60,
      periods: 7, // 7 periods per day
      // Use the logic from SettingsPage (startAfterPeriod)
      teaBreak: { startAfterPeriod: 2, minutes: 15 }, // Break after P2
      lunchBreak: { startAfterPeriod: 4, minutes: 45 }, // Break after P4
    })),
  });

  console.log('✅ Seed data loaded successfully!');
  console.log('You can now log in as:');
  console.log('User: admin@example.com');
  console.log('Pass: admin123');
  process.exit(0);
}

run().catch(err => {
  console.error('Seed script failed:');
  console.error(err);
  process.exit(1);
});