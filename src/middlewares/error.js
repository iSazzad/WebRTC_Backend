const { error } = require("../utils/response");
const STR = require("../utils/strings");

function notFound(req, res, next) {
  return error(res, 404, STR.NOT_FOUND, {});
}

// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  return error(res, status, err.message || STR.INTERNAL_SERVER_ERROR, {});
}

module.exports = { notFound, errorHandler };
