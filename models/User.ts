import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
  },
  password: {
    type: String,
    select: false, // Don't return password by default in queries
  },
  image: {
    type: String,
  },
  bio: {
    type: String,
    default: "", 
    maxLength: [160, "Bio cannot be more than 160 characters"],
  },
  provider: {
    type: String,
    default: "credentials", // 'google' or 'credentials'
  },
}, { timestamps: true });

// Prevent recompiling the model if it already exists (Next.js Hot Reload fix)
export default mongoose.models.User || mongoose.model("User", UserSchema);