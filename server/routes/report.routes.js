const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const controller = require("../controllers/report.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", controller.listPaged);
router.post("/draft", controller.saveDraft);
router.get("/:reportId", controller.getDetail);
router.get("/:reportId/available-actions", controller.getAvailableActions);
router.post("/:reportId/attachments", upload.single("file"), controller.addAttachment);
router.post("/:reportId/submit", controller.submit);
router.post("/:reportId/responses", controller.saveResponse);
router.post("/:reportId/cost-lines", controller.addCostLine);
router.post("/:reportId/submit-approval", controller.submitApproval);
router.post("/:reportId/return-for-supplement", controller.returnForSupplement);
router.post("/:reportId/approval-decision", controller.approvalDecision);
router.post("/:reportId/close", controller.closeReport);
router.delete("/:reportId", controller.deleteDraft);

module.exports = router;
