const { Router } = require("express");
const {
  createUser,
  updateUser,
  getUser,
  refreshToken,
  sendOtp,
  verifyOtp,
  getUserByEmail,
  getAllUsers,
} = require("../controllers/users.controller");
const authMiddleware = require("../middlewares/authMiddleware");

const router = Router();

router.post("", createUser); // Public - Create user & get tokens
router.put("", authMiddleware, updateUser); // Protected - Update
router.get("", authMiddleware, getUser); // Protected - Get User
router.get("/all", authMiddleware, getAllUsers); // Protected - Get all users
router.post("/refresh-token", refreshToken); // Public - Refresh token
router.post("/send-otp", sendOtp); // Public
router.post("/verify-otp", verifyOtp); // Public
router.get("/:email", getUserByEmail);

module.exports = router;
