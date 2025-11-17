"use strict";

function success(res, statusCode = 200, message = "", data = {}) {
  return res.status(statusCode).json({ message, data });
}

function error(res, statusCode = 500, message = "", data = {}) {
  return res.status(statusCode).json({ message, data });
}

module.exports = { success, error };
