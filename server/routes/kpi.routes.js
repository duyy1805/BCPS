const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const controller = require("../controllers/kpi.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/departments", controller.getDepartmentKPI);

module.exports = router;