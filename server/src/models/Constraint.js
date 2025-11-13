import mongoose from 'mongoose';
const constraintSchema = new mongoose.Schema({
type: { type: String, enum: ['TEACHER_UNAVAILABLE', 'ROOM_UNAVAILABLE', 'COURSE_FIXED_SLOT'], required: true },
data: {},
});
export default mongoose.model('Constraint', constraintSchema);