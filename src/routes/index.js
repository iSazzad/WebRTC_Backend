const { Router } = require("express");

const usersRouter = require("./users.routes");

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

router.use("/users", usersRouter);

module.exports = router;
