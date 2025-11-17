const { Router } = require("express");
const {
  createUser,
  updateUser,
  getUser,
  refreshToken,
  sendOtp,
  verifyOtp,
  getUserByEmail,
} = require("../controllers/users.controller");
const authMiddleware = require("../middlewares/authMiddleware");

const router = Router();

router.post("", createUser); // Public - Create user & get tokens
router.put("", authMiddleware, updateUser); // Protected - Update
router.get("", authMiddleware, getUser); // Protected - Get
router.post("/refresh-token", refreshToken); // Public - Refresh token
router.post("/send-otp", sendOtp); // Public
router.post("/verify-otp", verifyOtp); // Public
// Use path parameter to allow requests like: GET /api/users/abc%40c.com
// Client must URL-encode the email (e.g. abc%40c.com) when calling the path.
router.get("/:email", getUserByEmail);

module.exports = router;
