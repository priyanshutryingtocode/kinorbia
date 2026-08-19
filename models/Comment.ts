import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  parentType: {
    type: String,
    enum: ["review", "list"],
    required: true,
    index: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
    maxLength: 500,
  },
}, { timestamps: true });

export default mongoose.models?.Comment || mongoose.model("Comment", CommentSchema);