const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const controller = require("../controllers/dashboard.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/management", controller.getManagementDashboard);
router.get("/cost", controller.getCostDashboard);
router.get("/overdue/export", controller.exportOverdueDashboard);
router.get("/overdue", controller.getOverdueDashboard);

module.exports = router;
