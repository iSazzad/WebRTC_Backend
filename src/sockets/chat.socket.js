import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

/**
 * Fetch chats for a user, including last message and unread count
 * @param {*} socket
 * @returns
 */
export const findLastMessageWithUsers = async (socket) => {
  try {
    const userId = String(socket.user);
    const user = await User.findOne({ userId: userId }).select("_id");
    const _id = user?._id;

    const chats = await Chat.find({
      participants: _id,
    })
      .populate("lastMessage", "message messageType senderId createdAt")
      .populate("participants", "name userId email _id")
      .sort({ updatedAt: -1 })
      .lean();

    const chatList = await Promise.all(
      chats.map(async (chat) => {
        const lastReadAt = chat.lastRead?.[socket.user] || new Date(0);

        const unreadCount = await Message.countDocuments({
          chatUniqueId: chat.chatUniqueId,
          senderId: { $ne: _id },
          createdAt: { $gt: lastReadAt },
        });

        const otherUser = chat.participants.find(
          (p) => p._id.toString() !== _id.toString(),
        );

        return {
          chatUniqueId: chat.chatUniqueId,
          chatType: chat.chatType,

          user:
            chat.chatType === "private"
              ? {
                  userId: otherUser?.userId,
                  name: otherUser?.name,
                  email: otherUser?.email,
                }
              : null,

          lastMessage: chat.lastMessage && {
            text: chat.lastMessage.message,
            senderId: chat.lastMessage.senderId,
            time: chat.lastMessage.createdAt,
          },

          unreadCount,
        };
      }),
    );
    return {
      success: true,
      data: chatList,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Update messages as read for a user in a chat and update chat's lastRead timestamp
 * @param {*} chatUniqueId
 * @param {*} userId
 * @returns
 */
export const updateMessageReadStatus = async (chatUniqueId, userId) => {
  const user = await User.findOne({ userId }).select("_id");
  if (!user) return;

  await Message.updateMany(
    {
      chatUniqueId,
      senderId: { $ne: user._id },
      "status.readAt": null,
    },
    { "status.readAt": new Date() },
  );

  await Chat.updateOne(
    { chatUniqueId },
    {
      $set: {
        [`lastRead.${userId}`]: new Date(),
      },
    },
  );
};

/**
 * Handle sending a chat message: save to DB and return formatted message
 */
export const sendChatMessage = async (data) => {
  const { chatUniqueId, senderId, message } = data;

  const sender = await User.findOne({ userId: senderId }).select("_id");

  if (!sender) {
    return ack?.({
      success: false,
      error: "Sender not found",
    });
  }

  const newMessage = await Message.create({
    chatUniqueId,
    senderId: sender._id,
    message,
    status: {
      sentAt: new Date(),
    },
  });

  const populatedMessage = await Message.findById(newMessage._id).populate(
    "senderId",
    "userId",
  );

  const formattedMessage = {
    _id: populatedMessage._id.toString(),
    chatUniqueId: populatedMessage.chatUniqueId,
    senderId: populatedMessage.senderId.userId,
    message: populatedMessage.message,
    messageType: populatedMessage.messageType,
    status: populatedMessage.status,
    createdAt: populatedMessage.createdAt,
    updatedAt: populatedMessage.updatedAt,
  };

  // update last message
  await Chat.findOneAndUpdate(
    { chatUniqueId },
    { lastMessage: newMessage._id },
  );

  return formattedMessage;
};

/**
 * Fetch messages for a chat with pagination and mark them as read
 */
export const getChatMessages = async (data, socket) => {
  const { chatUniqueId, page = 1, limit = 20 } = data;

  const skip = (page - 1) * limit;
  await updateMessageReadStatus(chatUniqueId, socket.user);

  await Chat.updateOne(
    { chatUniqueId },
    { $set: { [`lastRead.${socket.user.toString()}`]: new Date() } },
  );

  const messages = await Message.find({ chatUniqueId })
    .sort({ createdAt: -1 }) // newest first
    .skip(skip)
    .limit(limit)
    .populate("senderId", "userId");

  const formattedMessages = messages.reverse().map((msg) => ({
    _id: msg._id,
    chatUniqueId: msg.chatUniqueId,
    senderId: msg.senderId.userId,
    message: msg.message,
    messageType: msg.messageType,
    status: msg.status,
    createdAt: msg.createdAt,
  }));

  return {
    page,
    messages: formattedMessages,
  };
};
