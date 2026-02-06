"use strict";

const crypto = require("crypto");

/**
 * Generate an (async) unique 16-char numeric userId using the provided User model.
 * The function accepts the User model to avoid cross-module requires.
 * @param {Model} UserModel - Mongoose User model
 * @returns {Promise<string>} userId
 */
async function generateUniqueUserId(UserModel) {
  let userId, existingUser;
  do {
    const buffer = crypto.randomBytes(8);
    const num = BigInt("0x" + buffer.toString("hex"))
      .toString()
      .slice(0, 16);
    userId = num.padStart(16, "0");
    existingUser = await UserModel.findOne({ userId });
  } while (existingUser);
  return userId;
}

function generate8CharId() {
  return crypto
    .randomBytes(6)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8);
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const createPrivateChatId = (userId1, userId2) => {
  return [userId1.toString(), userId2.toString()].sort().join("_");
};

const safeAck = (ack, payload) => {
  if (typeof ack === "function") {
    ack(payload);
  }
};

module.exports = {
  generateUniqueUserId,
  generate8CharId,
  generateOTP,
  createPrivateChatId,
  safeAck,
};
