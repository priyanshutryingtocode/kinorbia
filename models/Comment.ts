import mongoose from "mongoose";
import { authorFields } from "./shared";

const CommentSchema = new mongoose.Schema({
  // Which collection `parentId` points into, rather than a nullable second
  // ObjectId: one comment document then covers both a review and a list.
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
  ...authorFields,
  body: {
    type: String,
    required: true,
    maxLength: 500,
  },
}, { timestamps: true });

CommentSchema.index({ userEmail: 1 });

export default mongoose.models?.Comment || mongoose.model("Comment", CommentSchema);