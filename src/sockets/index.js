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
    if (socket.handshake.query) {
      const callerId = socket.handshake.query.callerId;
      socket.user = callerId;
      next();
    }
  });

  IO.on("connection", (socket) => {
    console.log(`${socket.user} Connected`);
    socket.join(socket.user);

    // 🔹 Caller initiates a call
    socket.on("call", (data) => {
      const { calleeId, rtcMessage } = data;

      socket.to(calleeId).emit("newCall", {
        callerId: socket.user,
        rtcMessage,
      });
    });

    // 🔹 Callee answers the call
    socket.on("answerCall", (data) => {
      const { callerId, rtcMessage } = data;

      socket.to(callerId).emit("callAnswered", {
        callee: socket.user,
        rtcMessage,
      });
    });

    // 🔹 ICE candidate exchange
    socket.on("ICEcandidate", (data) => {
      const { calleeId, rtcMessage } = data;
      socket.to(calleeId).emit("ICEcandidate", {
        sender: socket.user,
        rtcMessage,
      });
    });

    // 🔹 Caller cancels before callee answers
    socket.on("cancelCall", (data) => {
      const { calleeId } = data;
      console.log(`${socket.user} canceled call to ${calleeId}`);

      socket.to(calleeId).emit("callCanceled", {
        callerId: socket.user,
      });
    });

    // 🔹 Callee rejects incoming call
    socket.on("rejectCall", (data) => {
      const { callerId } = data;
      console.log(`${socket.user} rejected call from ${callerId}`);

      socket.to(callerId).emit("callRejected", {
        calleeId: socket.user,
      });
    });

    // End Call by user disconnects
    socket.on("endCall", (data) => {
      const { calleeId } = data;
      console.log(`Call ended by ${socket.user} for ${calleeId}`);

      // Notify the other side
      socket.to(calleeId).emit("callEnded", { sender: socket.user });
    });
  });
};

module.exports.getIO = () => {
  if (!IO) {
    throw Error("IO not initialized.");
  } else {
    return IO;
  }
};
