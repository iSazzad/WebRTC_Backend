import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import InvitationRequest from "../models/InvitationRequest.js";
import { createPrivateChatId } from "../utils/constants.js";
import e from "cors";

/**
 * Invite a user to connect
 * @param {*} toUserId
 * @param {*} socket
 * @returns
 */
export const inviteUser = async (toUserId, socket) => {
  const fromUser = await User.findOne({ userId: socket.user });
  const toUser = await User.findOne({ userId: toUserId });

  if (!fromUser || !toUser) {
    return {
      success: false,
      message: "User not found",
    };
  }

  const existingRequest = await InvitationRequest.findOne({
    fromUser: fromUser._id,
    toUser: toUser._id,
  });

  if (existingRequest && existingRequest.status === "pending") {
    return {
      success: false,
      message: "Invitation already sent",
    };
  } else if (existingRequest && existingRequest.status === "accepted") {
    return {
      success: false,
      message: "Invitation already accepted",
    };
  } else {
    let invitationRequest = existingRequest;
    if (existingRequest && existingRequest.status === "rejected") {
      existingRequest.status = "pending";
      await existingRequest.save();
    } else {
      invitationRequest = await InvitationRequest.create({
        fromUser: fromUser._id,
        toUser: toUser._id,
        status: "pending",
      });
    }

    return {
      success: true,
      data: {
        invitationRequestId: invitationRequest._id,
        fromUserId: socket.user,
      },
    };
  }
};

/**
 * Accept an invitation request
 * @param {*} invitationRequestId
 * @param {*} socket
 * @returns
 */
export const acceptInvitation = async (invitationRequestId) => {
  const invitationRequest =
    await InvitationRequest.findById(invitationRequestId);

  if (!invitationRequest || invitationRequest.status !== "pending") {
    return {
      success: false,
      message: "Invalid invitation request",
    };
  }

  invitationRequest.status = "accepted";
  await invitationRequest.save();

  const fromUser = await User.findById(invitationRequest.fromUser).select(
    "userId",
  );
  const toUser = await User.findById(invitationRequest.toUser).select("userId");
  console.log("fromUser:", fromUser, "toUser:", toUser);
  // Create a private chat between the users
  const chatUniqueId = createPrivateChatId(fromUser.userId, toUser.userId);

  let chat = await Chat.findOne({ chatUniqueId });

  if (!chat) {
    chat = await Chat.create({
      chatUniqueId,
      chatType: "private",
      participants: [invitationRequest.fromUser, invitationRequest.toUser],
    });
  }

  return {
    success: true,
    data: { chatUniqueId },
  };
};

/**
 * Reject an invitation request
 * @param {*} invitationRequestId
 * @param {*} socket
 * @returns
 */
export const rejectInvitation = async (invitationRequestId) => {
  const invitationRequest =
    await InvitationRequest.findById(invitationRequestId);

  if (!invitationRequest || invitationRequest.status !== "pending") {
    return {
      success: false,
      message: "Invalid invitation request",
    };
  }

  invitationRequest.status = "rejected";
  await invitationRequest.save();

  return {
    success: true,
    data: invitationRequest,
  };
};

/**
 * Important: Get list of users who have invited the socket user
 * @param {*} socketUserId
 * @returns
 */
export const getInvitedUsers = async (socketUserId) => {
  const user = await User.findOne({ userId: socketUserId }).select("_id");

  const invitedUsers = await InvitationRequest.find({
    toUser: user._id,
    status: "pending",
  }).populate("fromUser", "userId name email");

  const fetchedInvitedUsers = invitedUsers.map((invitation) => ({
    _id: invitation._id,
    fromUser: {
      userId: invitation.fromUser.userId,
      name: invitation.fromUser.name,
      email: invitation.fromUser.email,
    },
  }));
  return fetchedInvitedUsers;
};
