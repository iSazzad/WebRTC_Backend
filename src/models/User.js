const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    userId: { type: String, required: true, trim: true, unique: true },
    password: { type: String, trim: true },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true }
);

//
// 🔒 Hash password automatically before saving
//
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

//
// 🔑 Compare passwords (for login)
//
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

//
// 🔐 Generate short-lived access token
//
userSchema.methods.generateAuthToken = function (
  expiry = process.env.JWT_EXPIRES_IN || "7d"
) {
  const payload = { userId: this.userId };

  const options =
    expiry === "never"
      ? {} // No expiration
      : { expiresIn: expiry };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

//
// 🔄 Generate long-lived refresh token
//
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { userId: this.userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" } // default 30 days
  );
};

module.exports = mongoose.model("User", userSchema);
