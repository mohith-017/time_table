import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['LECTURE', 'LAB'], default: 'LECTURE' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional
  batch: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  hoursPerWeek: { type: Number, default: 4, min: 0 }
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);
