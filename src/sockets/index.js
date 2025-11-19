const { Server } = require("socket.io");
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

    // -------------------------------
    // CALL INITIATION
    // -------------------------------
    socket.on("call", ({ calleeId, rtcMessage, type }) => {
      socket.to(calleeId).emit("newCall", {
        callerId: socket.user,
        rtcMessage,
        type,
      });
    });

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

    // -------------------------------
    // MEDIA CHANGE (UPGRADE/DOWNGRADE)
    // -------------------------------
    socket.on("requestMediaChange", ({ calleeId, type }) => {
      console.log(
        `📨 Media-change request ${socket.user} → ${calleeId} (${type})`
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
  });
};

module.exports.getIO = () => IO;
