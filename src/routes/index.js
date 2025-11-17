const { Router } = require("express");

const usersRouter = require("./users.routes");

const router = Router();
const { success } = require("../utils/response");
const STR = require("../utils/strings");

router.get("/", (req, res) => {
  return success(res, 200, STR.API_IS_RUNNING, {});
});

router.use("/users", usersRouter);

module.exports = router;
