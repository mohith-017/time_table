// server/src/services/generator.js
import Settings from '../models/Settings.js';
import Course from '../models/Course.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Timetable from '../models/Timetable.js';

// --- FIX START ---
// Replaced the old (flawed) isInBlock function with this robust version
/**
 * Checks if a given period 'p' is a break.
 * Handles two types of break config:
 * 1. { startPeriod: 2, length: 1 } (from seed.js) => break IS P2
 * 2. { startAfterPeriod: 2, minutes: 15 } (from SettingsPage.jsx) => break IS P3
 */
function isInBlock(p, blk) {
  if (!blk) return false;

  let startP = 0;
  let len = 0;

  if (blk.startAfterPeriod != null) {
    // Logic from SettingsPage.jsx
    // "after period 2" means the break starts AT period 3
    startP = Number(blk.startAfterPeriod) + 1;
    // Generator logic is period-based, so assume 1-period break
    len = (Number(blk.minutes ?? 0) > 0) ? 1 : 0;
  } else if (blk.startPeriod != null) {
    // Logic from seed.js
    // "startPeriod 2" means the break IS period 2
    startP = Number(blk.startPeriod);
    len = (Number(blk.length ?? 0) > 0) ? 1 : 0;
  }

  if (len === 0 || startP === 0) return false; // Break is disabled

  // p=3, startP=3, len=1 => (3 >= 3 && 3 < 4) => true. Correct.
  // p=2, startP=2, len=1 => (2 >= 2 && 2 < 3) => true. Correct.
  return p >= startP && p < (startP + len);
}
// --- FIX END ---

function dayConfigOf(settings, day) {
  return settings.dayConfig?.find(d => d.day === day);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function generateTimetable({ batch, section }) {
  const settings = await Settings.findOne();
  if (!settings) throw new Error('Settings not found');

  const workingDays = settings.workingDays || [1,2,3,4,5];
  const dayConfs = new Map(workingDays.map(d => [d, dayConfigOf(settings, d)]));
  const firstDC = dayConfs.get(workingDays[0]);
  const periodsPerDay = Number(firstDC?.periods || 6);

  // Pull relevant data
  const courses = await Course.find({ batch, section }).lean();
  const rooms = await Room.find().lean();
  const teachers = await User.find({ role: 'TEACHER' }).lean();

  const teacherById = new Map(teachers.map(t => [String(t._id), t]));
  const roomsByType = {
    LECTURE: rooms.filter(r => (r.type || 'LECTURE') !== 'LAB'),
    LAB: rooms.filter(r => (r.type || 'LECTURE') === 'LAB'),
  };
  const anyLectureRoom = roomsByType.LECTURE.length ? roomsByType.LECTURE : rooms;
  const anyLabRoom = roomsByType.LAB.length ? roomsByType.LAB : rooms;

  const occupied = {};
  const teacherLoadDay = {};

  for (const d of workingDays) {
    occupied[d] = {};
    for (let p = 1; p <= periodsPerDay; p++) {
      occupied[d][p] = { teachers: new Set(), rooms: new Set() };
    }
  }

  const unavail = new Map();
  for (const t of teachers) {
    // This map correctly reads [{day, period}] thanks to the User.js schema fix
    const s = new Set((t.teacher?.unavailable || []).map(u => `${u.day}:${u.period}`));
    unavail.set(String(t._id), s);
  }

  let tt = await Timetable.findOne({ batch, section });
  if (!tt) tt = new Timetable({ batch, section, grid: [] });
  tt.grid = [];

  const canPlaceSingle = (teacherId, roomId, day, period) => {
    const dc = dayConfs.get(day) || {};
    // Use the robust isInBlock function
    if (isInBlock(period, dc.teaBreak) || isInBlock(period, dc.lunchBreak)) return false;
    if (unavail.get(String(teacherId))?.has(`${day}:${period}`)) return false;
    if (occupied[day][period].teachers.has(String(teacherId))) return false;
    if (occupied[day][period].rooms.has(String(roomId))) return false;
    const load = (teacherLoadDay[String(teacherId)]?.[day] || 0);
    const max = teacherById.get(String(teacherId))?.teacher?.maxLoadPerDay ?? 6;
    if (load >= max) return false;
    return true;
  };

  const placeSingle = (course, teacherId, roomId, day, period) => {
    occupied[day][period].teachers.add(String(teacherId));
    occupied[day][period].rooms.add(String(roomId));
    teacherLoadDay[String(teacherId)] = teacherLoadDay[String(teacherId)] || {};
    teacherLoadDay[String(teacherId)][day] = (teacherLoadDay[String(teacherId)][day] || 0) + 1;

    tt.grid.push({
      day,
      period,
      course: course._id,
      teacher: teacherId,
      room: roomId,
    });
  };

  const canPlaceDouble = (teacherId, roomId, day, period) => {
    if (period >= periodsPerDay) return false;
    const dc = dayConfs.get(day) || {};
    for (const p of [period, period + 1]) {
      // Use the robust isInBlock function
      if (isInBlock(p, dc.teaBreak) || isInBlock(p, dc.lunchBreak)) return false;
      if (unavail.get(String(teacherId))?.has(`${day}:${p}`)) return false;
      if (occupied[day][p].teachers.has(String(teacherId))) return false;
      if (occupied[day][p].rooms.has(String(roomId))) return false;
    }
    const load = (teacherLoadDay[String(teacherId)]?.[day] || 0);
    const max = teacherById.get(String(teacherId))?.teacher?.maxLoadPerDay ?? 6;
    if (load + 2 > max) return false;
    return true;
  };

  const placeDouble = (course, teacherId, roomId, day, period) => {
    for (const p of [period, period + 1]) {
      occupied[day][p].teachers.add(String(teacherId));
      occupied[day][p].rooms.add(String(roomId));
    }
    teacherLoadDay[String(teacherId)] = teacherLoadDay[String(teacherId)] || {};
    teacherLoadDay[String(teacherId)][day] = (teacherLoadDay[String(teacherId)][day] || 0) + 2;

    tt.grid.push({ day, period,   course: course._id, teacher: teacherId, room: roomId });
    tt.grid.push({ day, period: period + 1, course: course._id, teacher: teacherId, room: roomId });
  };

  const expandNeeds = [];
  for (const c of courses) {
    const hours = Number(c.hoursPerWeek || 0);
    if (c.type === 'LAB') {
      const blocks = Math.floor(hours / 2);
      for (let i = 0; i < blocks; i++) expandNeeds.push({ course: c, kind: 'LAB2' });
      if (hours % 2 === 1) expandNeeds.push({ course: c, kind: 'LECTURE1' });
    } else {
      for (let i = 0; i < hours; i++) expandNeeds.push({ course: c, kind: 'LECTURE1' });
    }
  }

  const pickTeacher = (course) => {
    if (course.teacher) return [String(course.teacher)];
    const matching = teachers.filter(t => (t.teacher?.skills || []).includes(course.code)).map(t=>String(t._id));
    if (matching.length) return shuffle([...matching]);
    return shuffle(teachers.map(t => String(t._id)));
  };

  const pickRoomCandidates = (forLab) => {
    const pool = forLab ? anyLabRoom : anyLectureRoom;
    return shuffle(pool.map(r => String(r._id)));
  };

  for (const item of expandNeeds) {
    const c = item.course;

    if (item.kind === 'LAB2') {
      let placed = false;
      const roomCandidates = pickRoomCandidates(true);
      const teacherCandidates = pickTeacher(c);
      for (const d of workingDays) {
        if (placed) break;
        const dc = dayConfs.get(d) || {};
        const periods = Number(dc.periods || periodsPerDay);

        for (const roomId of roomCandidates) {
          for (const teacherId of teacherCandidates) {
            for (let p = 1; p <= periods - 1; p++) {
              if (canPlaceDouble(teacherId, roomId, d, p)) {
                placeDouble(c, teacherId, roomId, d, p);
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
          if (placed) break;
        }
      }
    } else {
      let placed = false;
      const roomCandidates = pickRoomCandidates(false);
      const teacherCandidates = pickTeacher(c);
      for (const d of workingDays) {
        if (placed) break;
        const dc = dayConfs.get(d) || {};
        const periods = Number(dc.periods || periodsPerDay);

        for (const roomId of roomCandidates) {
          for (const teacherId of teacherCandidates) {
            for (let p = 1; p <= periods; p++) {
              if (canPlaceSingle(teacherId, roomId, d, p)) {
                placeSingle(c, teacherId, roomId, d, p);
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
          if (placed) break;
        }
      }
    }
  }

  await tt.save();
  return { ok: true, placed: tt.grid.length };
}