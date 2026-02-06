import mongoose from "mongoose";

const invitationRequestSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

invitationRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

export default mongoose.model("InvitationRequest", invitationRequestSchema);
