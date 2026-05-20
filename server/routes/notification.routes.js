const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const controller = require("../controllers/notification.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", controller.list);
router.get("/unread-count", controller.unreadCount);
router.post("/:notificationId/read", controller.markRead);
router.post("/read-all", controller.markAllRead);

module.exports = router;
