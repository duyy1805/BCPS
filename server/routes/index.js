const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");

const reportRoutes = require("./report.routes");
const worklistRoutes = require("./worklist.routes");
const dashboardRoutes = require("./dashboard.routes");
const kpiRoutes = require("./kpi.routes");
const authRoutes = require("./auth.routes");

const meController = require("../controllers/me.controller");
const masterDataController = require("../controllers/master-data.controller");
const erpController = require("../controllers/erp.controller");

const router = express.Router();

router.get("/api/me/permissions", authMiddleware, meController.getMyPermissions);

router.get("/api/report-form/master-data", authMiddleware, masterDataController.getCreateFormMasterData);
router.get("/api/departments", authMiddleware, masterDataController.searchDepartments);
router.get("/api/employees/search", authMiddleware, masterDataController.searchEmployees);

router.use("/api/auth", authRoutes); // Thêm dòng này
router.get("/api/me/permissions", authMiddleware, meController.getMyPermissions);

router.get("/api/erp/production-plans/search", authMiddleware, erpController.searchProductionPlans);
router.get("/api/erp/production-plans/detail", authMiddleware, erpController.getProductionPlanDetail);

router.use("/api/reports", reportRoutes);
router.use("/api/worklist", worklistRoutes);
router.use("/api/dashboard", dashboardRoutes);
router.use("/api/kpi", kpiRoutes);

module.exports = router;