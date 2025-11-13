// server/src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["ADMIN","TEACHER","STUDENT"], default: "STUDENT" },
  // student subdocument
  student: {
    batch: { type: String, default: "" },
    section: { type: String, default: "" }
  },
  // teacher subdocument
  teacher: {
    skills: { type: [String], default: [] },
    maxLoadPerDay: { type: Number, default: 6 },
    // --- FIX START ---
    // Was: unavailable: { type: [String], default: [] }
    // This caused [{day, period}] to be saved as "[object Object]"
    unavailable: { 
      type: [{ day: Number, period: Number }], 
      default: [] 
    }
    // --- FIX END ---
  }
}, { timestamps: true });

// pre-save hook - hash password if modified
userSchema.pre("save", async function(next) {
  try {
    if (!this.isModified("password")) return next();
    const saltRounds = 10;
    const hash = await bcrypt.hash(this.password, saltRounds);
    this.password = hash;
    return next();
  } catch (err) {
    console.error("[User.pre.save] bcrypt error:", err && err.stack ? err.stack : err);
    // don't crash entire process; forward error to mongoose
    return next(err);
  }
});

// instance method to compare password
userSchema.methods.comparePassword = async function(candidate) {
  try {
    return await bcrypt.compare(candidate, this.password);
  } catch (err) {
    console.error("[User.comparePassword] bcrypt.compare error:", err && err.stack ? err.stack : err);
    return false;
  }
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;