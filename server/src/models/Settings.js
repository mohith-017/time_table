import mongoose from 'mongoose';
const settingsSchema = new mongoose.Schema({
workingDays: { type: [Number], default: [1,2,3,4,5] }, // 1=Mon .. 7=Sun
dayConfig: [{
day: Number, // 1..7
start: String, // "09:00"
end: String, // "17:00"
periodMinutes: Number,
periods: Number,
teaBreak: { startPeriod: Number, length: Number },
lunchBreak: { startPeriod: Number, length: Number }
}]
}, { timestamps: true });
export default mongoose.model('Settings', settingsSchema);