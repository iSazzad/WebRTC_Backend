import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    chatUniqueId: String,
    chatType: { type: String, enum: ["private", "group"], default: "private" },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    lastRead: {
      type: Map,
      of: Date,
      default: {},
    },

    groupName: String,
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Chat", chatSchema);
