const { Router } = require("express");
const {
  createUser,
  updateUser,
  getUser,
  refreshToken,
} = require("../controllers/users.controller");
const authMiddleware = require("../middlewares/authMiddleware");

const router = Router();

router.post("", createUser); // Public - Create user & get tokens
router.patch("", authMiddleware, updateUser); // Protected - Update
router.get("", authMiddleware, getUser); // Protected - Get
router.post("/refresh-token", refreshToken); // Public - Refresh token

module.exports = router;
