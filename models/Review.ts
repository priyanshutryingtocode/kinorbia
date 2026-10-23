import mongoose from "mongoose";
import { authorFields, mediaCoreFields, socialFields, visibilityField } from "./shared";

const ReviewSchema = new mongoose.Schema({
  ...authorFields,
  ...mediaCoreFields,
  body: {
    type: String,
    required: true,
    maxLength: 1200,
  },
  visibility: visibilityField,
  spoiler: {
    type: Boolean,
    default: false,
  },
  ...socialFields,
}, { timestamps: true });

ReviewSchema.index({ userEmail: 1 });
ReviewSchema.index({ visibility: 1 });
ReviewSchema.index({ movieId: 1, mediaType: 1, visibility: 1, createdAt: -1 });
ReviewSchema.index({ visibility: 1, createdAt: -1, _id: -1 });
ReviewSchema.index({ userEmail: 1, createdAt: -1, _id: -1 });

export default mongoose.models?.Review || mongoose.model("Review", ReviewSchema);