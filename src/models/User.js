const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {
  jwtSecret,
  jwtExpiresIn,
  jwtRefreshExpiresIn,
} = require("../config/env");

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
    otp: { type: String, trim: true },
    otpExpiresAt: { type: Date },
    verified: { type: Boolean, default: false },
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
userSchema.methods.generateAuthToken = function (expiry = jwtExpiresIn) {
  const payload = { userId: this.userId };

  const options =
    expiry === "never"
      ? {} // No expiration
      : { expiresIn: expiry };

  return jwt.sign(payload, jwtSecret, options);
};

//
// 🔄 Generate long-lived refresh token
//
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { userId: this.userId },
    jwtSecret,
    { expiresIn: jwtRefreshExpiresIn } // default 30 days
  );
};

module.exports = mongoose.model("User", userSchema);
