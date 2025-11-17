const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { error } = require("../utils/response");
const STR = require("../utils/strings");
const { jwtSecret } = require("../config/env");

module.exports = async function (req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return error(res, 401, STR.AUTHORIZATION_TOKEN_MISSING, {});

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, jwtSecret);

    const user = await User.findOne({ userId: decoded.userId });
    if (!user) return error(res, 404, STR.USER_NOT_FOUND, {});

    req.user = user;
    next();
  } catch (err) {
    return error(res, 401, STR.INVALID_OR_EXPIRED_TOKEN, {});
  }
};
