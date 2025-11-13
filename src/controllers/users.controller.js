const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🧩 Generate unique 16-digit user ID
async function generateUniqueUserId() {
  let userId, existingUser;
  do {
    const buffer = crypto.randomBytes(8);
    const num = BigInt("0x" + buffer.toString("hex"))
      .toString()
      .slice(0, 16);
    userId = num.padStart(16, "0");
    console.log("new upated id: ", userId);

    existingUser = await User.findOne({ userId });
  } while (existingUser);
  return userId;
}

function generate8CharId() {
  return crypto
    .randomBytes(6) // 6 bytes ≈ 8 characters after base64url encoding
    .toString("base64") // convert to base64
    .replace(/[^a-zA-Z0-9]/g, "") // remove non-alphanumeric
    .slice(0, 8); // keep first 8 chars
}

// 1️⃣ Create user + return access & refresh token
async function createUser(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    // Check if email exists
    if (email) {
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(409).json({ message: "Email already exists" });
    }

    const dummyName = generate8CharId();

    const userId = await generateUniqueUserId();

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

    return res.status(201).json({
      message: "User created successfully",
      user: { name: user.name, email: user.email, userId: user.userId },
      tokens: {
        access: accessToken,
        refresh: refreshToken,
      },
    });
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
      if (existing)
        return res.status(409).json({ message: "Email already exists" });
      user.email = email;
    }

    if (name) user.name = name;
    await user.save();

    return res.status(200).json({
      message: "User updated successfully",
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
    return res.status(200).json({
      message: "Receiver User Details successfully",
      user: { name: user.name, email: user.email, userId: user.userId },
    });
  } catch (err) {
    next(err);
  }
}

// 4️⃣ Refresh token (generate new access token)
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "Refresh token required" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const user = await User.findOne({ userId: decoded.userId });
    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ message: "Invalid refresh token" });

    const newAccessToken = user.generateAuthToken("24h");

    return res.status(200).json({
      message: "New token issued",
      token: newAccessToken,
    });
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token" });
  }
}

module.exports = {
  createUser,
  updateUser,
  getUser,
  refreshToken,
};
