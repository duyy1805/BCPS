const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const controller = require("../controllers/worklist.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/my-inbox", controller.getMyInbox);
router.get("/department/:departmentCode", controller.getDepartmentQueue);

module.exports = router;