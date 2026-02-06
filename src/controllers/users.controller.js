const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendOtpEmail } = require("../utils/email");
const { success, error } = require("../utils/response");
const {
  generateUniqueUserId,
  generate8CharId,
  generateOTP,
} = require("../utils/constants");
const STR = require("../utils/strings");
const { jwtSecret } = require("../config/env");
const { default: InvitationRequest } = require("../models/InvitationRequest");

// 1️⃣ Create user
async function createUser(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    // Check if email exists
    if (email) {
      const existing = await User.findOne({ email });
      if (existing) return error(res, 409, STR.EMAIL_ALREADY_EXISTS, {});
    }

    const dummyName = generate8CharId();
    const userId = await generateUniqueUserId(User);

    const user = await User.create({
      name: name || dummyName,
      email: email || null,
      userId,
      password: password || null,
    });

    // Generate tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();
    if (email) {
      // Generate OTP and expiry
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();

      // Send OTP via email ✉️
      await sendOtpEmail(email, otp);

      return success(res, 200, STR.OTP_SENT_SUCCESS, {
        email,
        expiresIn: "15 minutes",
      });
    } else {
      return success(res, 201, STR.GUEST_CREATED_SUCCESS, {
        user: { name: user.name, email: user.email, userId: user.userId },
        tokens: { access: accessToken, refresh: refreshToken },
      });
    }
  } catch (err) {
    next(err);
  }
}

// 2️⃣ Update user (auth required)
async function updateUser(req, res, next) {
  try {
    const { name, email } = req.body;
    const user = req.user; // set by authMiddleware

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return error(res, 409, STR.EMAIL_ALREADY_EXISTS, {});
      user.email = email;
    }

    if (name) user.name = name;
    await user.save();

    return success(res, 200, STR.USER_UPDATED_SUCCESS, {
      user: { name: user.name, email: user.email, userId: user.userId },
    });
  } catch (err) {
    next(err);
  }
}

// 3️⃣ Get user (auth required)
async function getUser(req, res, next) {
  try {
    const user = req.user;
    return success(res, 200, STR.RECEIVER_USER_DETAILS, {
      user: { name: user.name, email: user.email, userId: user.userId },
    });
  } catch (err) {
    next(err);
  }
}

//Get All users (auth required)
async function getAllUsers(req, res, next) {
  try {
    const users = await User.find({}).sort({ name: 1 });

    const toUserIds = users.map((user) => user._id);

    const invitationsPending = await InvitationRequest.find({
      fromUser: req.user._id,
      toUser: { $in: toUserIds },
      status: "pending",
    }).select("toUser");

    const invitationsAccepted = await InvitationRequest.find({
      fromUser: req.user._id,
      toUser: { $in: toUserIds },
      status: "accepted",
    }).select("toUser");

    const invitationPending = new Set(
      invitationsPending.map((inv) => inv.toUser.toString()),
    );

    const invitationAccepted = new Set(
      invitationsAccepted.map((inv) => inv.toUser.toString()),
    );

    const data = users.map((user) => ({
      name: user.name,
      email: user.email,
      userId: user.userId,
      verified: user.verified,
      hasInvitation: invitationPending.has(user._id.toString()),
      hasAcceptedInvitation: invitationAccepted.has(user._id.toString()),
    }));

    return success(res, 200, STR.ALL_USERS_FETCHED_SUCCESS, data);
  } catch (err) {
    console.log("error: ", err);

    next(err);
  }
}

// 4️⃣ Refresh token (generate new access token)
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 400, STR.REFRESH_TOKEN_REQUIRED, {});

    const decoded = jwt.verify(refreshToken, jwtSecret);

    const user = await User.findOne({ userId: decoded.userId });
    if (!user || user.refreshToken !== refreshToken)
      return error(res, 401, STR.INVALID_REFRESH_TOKEN, {});

    const newAccessToken = user.generateAuthToken("24h");

    return success(res, 200, STR.NEW_TOKEN_ISSUED, { token: newAccessToken });
  } catch (err) {
    return error(res, 401, STR.INVALID_OR_EXPIRED_REFRESH, {});
  }
}

async function getUserByEmail(req, res, next) {
  try {
    // Support email as URL path param: /api/users/:email
    const raw = req.params && req.params.email;
    const email = raw ? decodeURIComponent(raw) : null;
    if (!email) return error(res, 400, STR.EMAIL_IS_REQUIRED, {});

    const user = await User.findOne({ email });
    if (!user) return error(res, 404, STR.USER_NOT_FOUND, {});

    return success(res, 200, STR.USER_FETCHED_SUCCESS, {
      name: user.name,
      email: user.email,
      userId: user.userId,
      verified: user.verified,
    });
  } catch (err) {
    next(err);
  }
}

//5 Send OTP to Verify User Email
async function sendOtp(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) return error(res, 400, STR.EMAIL_IS_REQUIRED, {});

    // Find User
    const user = await User.findOne({ email });
    console.log("user data: ", user);

    if (!(user && user.email)) return error(res, 404, STR.USER_NOT_FOUND, {});

    // Generate OTP and expiry
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP via email ✉️
    await sendOtpEmail(email, otp);

    return success(res, 200, STR.OTP_SENT_SUCCESS, {
      email,
      expiresIn: "15 minutes",
    });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    next(err);
  }
}

// Verify User Email OTP
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return error(res, 400, STR.EMAIL_AND_OTP_REQUIRED, {});

    const user = await User.findOne({ email });
    if (!user) return error(res, 404, STR.USER_NOT_FOUND, {});

    if (user.otp !== otp) return error(res, 400, STR.INVALID_OTP, {});

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt)
      return error(res, 400, STR.OTP_EXPIRED, {});

    user.verified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    // Generate access and refresh tokens after successful verification (match createUser response)
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return success(res, 200, STR.OTP_VERIFIED_SUCCESS, {
      user: {
        email: user.email,
        name: user.name,
        userId: user.userId,
        verified: user.verified,
      },
      tokens: { access: accessToken, refresh: refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUser,
  updateUser,
  getUser,
  refreshToken,
  getUserByEmail,
  sendOtp,
  verifyOtp,
  getAllUsers,
};
