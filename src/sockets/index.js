const { Server } = require("socket.io");
const { createPrivateChatId, safeAck } = require("../utils/constants");
const Chat = require("../models/Chat").default;
const Message = require("../models/Message").default;
const User = require("../models/User");
const {
  findLastMessageWithUsers,
  updateMessageReadStatus,
  sendChatMessage,
  getChatMessages,
} = require("./chat.socket");
const {
  inviteUser,
  acceptInvitation,
  getInvitedUsers,
  rejectInvitation,
} = require("./invite.socket");
let IO;

module.exports.initIO = (httpServer) => {
  IO = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  IO.use((socket, next) => {
    const callerId = socket.handshake.query?.callerId;
    if (!callerId) return next(new Error("callerId missing"));
    socket.user = callerId;
    next();
  });

  IO.on("connection", (socket) => {
    console.log(`✅ ${socket.user} connected`);
    socket.join(socket.user);

    // CALL INITIATION
    socket.on(
      "call",
      ({ calleeId, callUUID, calleeName, rtcMessage, type }) => {
        socket.to(calleeId).emit("newCall", {
          callerId: socket.user,
          callUUID,
          callerName: calleeName,
          rtcMessage,
          type,
        });
      },
    );

    // ANSWER CALL
    socket.on("answerCall", ({ callerId, rtcMessage, type }) => {
      socket.to(callerId).emit("callAnswered", {
        callee: socket.user,
        rtcMessage,
        type,
      });
    });

    // EXCHANGE ICE CANDIDATES
    socket.on("ICEcandidate", ({ calleeId, rtcMessage, type }) => {
      socket.to(calleeId).emit("ICEcandidate", {
        sender: socket.user,
        rtcMessage,
        type,
      });
    });

    // CANCEL CALL
    socket.on("cancelCall", ({ calleeId }) => {
      socket.to(calleeId).emit("callCanceled", {
        callerId: socket.user,
      });
    });

    // REJECT CALL
    socket.on("rejectCall", ({ callerId }) => {
      socket.to(callerId).emit("callRejected", {
        calleeId: socket.user,
      });
    });

    // END CALL
    socket.on("endCall", ({ calleeId }) => {
      socket.to(calleeId).emit("callEnded", {
        sender: socket.user,
      });
    });

    // MEDIA CHANGE (UPGRADE/DOWNGRADE)
    socket.on("requestMediaChange", ({ calleeId, type }) => {
      console.log(
        `📨 Media-change request ${socket.user} → ${calleeId} (${type})`,
      );

      socket.to(calleeId).emit("incomingMediaChangeRequest", {
        type,
        callerId: socket.user,
      });
    });

    socket.on("approveMediaChange", ({ callerId, type }) => {
      console.log(`✔️ Approved ${type} by ${socket.user} → ${callerId}`);

      socket.to(callerId).emit("mediaChangeApproved", {
        type,
        calleeId: socket.user,
      });
    });

    socket.on("rejectMediaChange", ({ callerId, type }) => {
      console.log(`❌ Rejected ${type} by ${socket.user}`);

      socket.to(callerId).emit("mediaChangeRejected", {
        type,
        calleeId: socket.user,
      });
    });

    socket.on("endVideo", ({ callerId, type }) => {
      console.log(`❌ endVideo ${type} by ${socket.user}`);

      socket.to(callerId).emit("endedVideo", {
        type,
        calleeId: socket.user,
      });
    });

    // JOIN CHAT
    socket.on("joinChat", async ({ chatUniqueId }) => {
      let chat = await Chat.findOne({ chatUniqueId });

      if (!chat) {
        return socket.emit("chatError", { message: "Chat not found" });
      }

      socket.join(chatUniqueId);
      socket.emit("chatReady", { chatUniqueId });
    });

    // LEAVE CHAT
    socket.on("leaveChat", ({ chatUniqueId }) => {
      console.log("Chat disconnected:", socket.user, chatUniqueId);
      socket.leave(chatUniqueId);
    });

    // SEND MESSAGE
    socket.on("sendMessage", async (data, ack) => {
      try {
        const formattedMessage = await sendChatMessage(data);

        // 📤 send to OTHER users
        socket.to(data.chatUniqueId).emit("receiveMessage", {
          message: formattedMessage,
        });

        const chat = await Chat.findOne({
          chatUniqueId: data.chatUniqueId,
        }).populate("participants", "userId _id");

        for (const participant of chat.participants) {
          socket.to(participant.userId).emit("chatListUpdate", {
            messageId: formattedMessage._id,
            senderId: formattedMessage.senderId,
            chatUniqueId: data.chatUniqueId,
          });
        }

        // ✅ ACK back to SENDER
        ack?.({
          success: true,
          message: formattedMessage,
        });
      } catch (err) {
        console.error("sendMessage error:", err);

        ack?.({
          success: false,
          error: "Failed to send message",
        });
      }
    });

    // FETCH MESSAGES WITH PAGINATION
    socket.on("getMessages", async (data) => {
      const result = await getChatMessages(data, socket);

      socket.emit("messagesList", {
        page: result.page,
        messages: result.messages,
      });
    });

    // MARK MESSAGE AS DELIVERED
    socket.on("messageDelivered", async ({ messageId, chatUniqueId }) => {
      await Message.findByIdAndUpdate(messageId, {
        "status.deliveredAt": new Date(),
      });
      socket
        .to(chatUniqueId)
        .emit("deliveryReceipt", { userId: socket.user, messageId });
    });

    // MARK MESSAGE AS READ
    socket.on("messageRead", async ({ chatUniqueId, userId }) => {
      console.log("messageRead event:", { chatUniqueId, userId });

      await updateMessageReadStatus(chatUniqueId, userId);
      socket.to(chatUniqueId).emit("readReceipt", { userId });
    });

    // FETCH CHAT LIST WITH LAST MESSAGES
    socket.on("lastMessageWithUsers", async () => {
      const result = await findLastMessageWithUsers(socket);
      socket.emit("chatListResponse", result);
    });

    // FETCH INVITED USERS
    socket.on("invitedUsers", async (data, ack) => {
      try {
        const invitedUsers = await getInvitedUsers(socket.user);
        ack({ success: true, data: invitedUsers });
      } catch (err) {
        console.error("invitedUsers error:", err);
        ack({ success: false, message: "Failed to fetch invited users" });
      }
    });

    // INVITE USER
    socket.on("inviteUser", async (data, ack) => {
      const { toUserId } = data;
      const invitationData = await inviteUser(toUserId, socket);
      if (!invitationData.success) {
        return ack({ success: false, message: invitationData.message });
      }
      socket.to(toUserId).emit("invitedUsersUpdate", {});
      ack({ success: true, data: invitationData.data });
    });

    // ACCEPT INVITATION
    socket.on("acceptInvitation", async (data, ack) => {
      const { invitationRequestId } = data;
      const acceptanceData = await acceptInvitation(invitationRequestId);

      if (!acceptanceData.success) {
        return ack?.(acceptanceData);
      }
      socket.to(acceptanceData.data.fromUserId).emit("invitedUsersUpdate", {});
      console.log("acceptance data: ", acceptanceData);
      ack?.(acceptanceData);
    });

    // REJECT INVITATION
    socket.on("rejectInvitation", async (data, ack) => {
      const { invitationRequestId } = data;
      const rejectionData = await rejectInvitation(invitationRequestId);

      if (!rejectionData.success) {
        return ack?.(rejectionData);
      }
      socket.to(rejectionData.data.fromUserId).emit("invitedUsersUpdate", {});
      ack?.(rejectionData);
    });
  });
};

module.exports.getIO = () => IO;
