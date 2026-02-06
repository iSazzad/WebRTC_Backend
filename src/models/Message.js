import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatUniqueId: {
      type: String,
      required: true,
      index: true, // fast chat fetch
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },

    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text",
    },

    status: {
      sentAt: {
        type: Date,
        default: Date.now,
      },
      deliveredAt: {
        type: Date,
        default: null,
      },
      readAt: {
        type: Date,
        default: null,
      },
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true, // createdAt & updatedAt
  },
);

export default mongoose.model("Message", messageSchema);