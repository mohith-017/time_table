import mongoose from 'mongoose';
const roomSchema = new mongoose.Schema({
name: { type: String, required: true, unique: true },
capacity: { type: Number, default: 60 },
type: { type: String, enum: ['LECTURE', 'LAB'], default: 'LECTURE' }
});
export default mongoose.model('Room', roomSchema);