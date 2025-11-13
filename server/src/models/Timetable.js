import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  day: Number,
  period: Number,
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  batch: { type: String, required: true },
  section: { type: String, required: true },
  grid: { type: [slotSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('Timetable', timetableSchema);
