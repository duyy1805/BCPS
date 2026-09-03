const ReportService = require("../services/report.service");

const service = new ReportService();

async function listPaged(req, res, next) {
    try {
        const result = await service.listPaged(req.query, req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function saveDraft(req, res, next) {
    try {
        const result = await service.saveDraft(req.body, req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function getDetail(req, res, next) {
    try {
        const result = await service.getDetail(Number(req.params.reportId));
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function getAvailableActions(req, res, next) {
    try {
        const result = await service.getAvailableActions(Number(req.params.reportId), req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function submit(req, res, next) {
    try {
        const result = await service.submit(Number(req.params.reportId), req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function saveResponse(req, res, next) {
    try {
        const result = await service.saveResponse(Number(req.params.reportId), req.body, req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function addCostLine(req, res, next) {
    try {
        const result = await service.addCostLine(Number(req.params.reportId), req.body, req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function submitApproval(req, res, next) {
    try {
        const result = await service.submitApproval(Number(req.params.reportId), req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function approvalDecision(req, res, next) {
    try {
        const result = await service.approvalDecision(Number(req.params.reportId), req.body, req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function closeReport(req, res, next) {
    try {
        const result = await service.close(Number(req.params.reportId), req.body, req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function returnForSupplement(req, res, next) {
    try {
        const result = await service.returnForSupplement(
            Number(req.params.reportId),
            req.body,
            req.currentUser
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function deleteDraft(req, res, next) {
    try {
        const result = await service.deleteDraft(Number(req.params.reportId), req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function addAttachment(req, res, next) {
    try {
        if (!req.file) {
            throw new Error("Chưa có file upload.");
        }

        const result = await service.addAttachment(
            Number(req.params.reportId),
            req.file,
            req.body,
            req.currentUser
        );

        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listPaged,
    saveDraft,
    getDetail,
    getAvailableActions,
    submit,
    saveResponse,
    addCostLine,
    submitApproval,
    returnForSupplement,
    approvalDecision,
    closeReport,
    deleteDraft,
    addAttachment
};
