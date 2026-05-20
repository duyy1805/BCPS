const NotificationService = require("../services/notification.service");

const service = new NotificationService();

async function list(req, res, next) {
    try {
        const result = await service.list(req.query, req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function unreadCount(req, res, next) {
    try {
        const result = await service.unreadCount(req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function markRead(req, res, next) {
    try {
        const result = await service.markRead(Number(req.params.notificationId), req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function markAllRead(req, res, next) {
    try {
        const result = await service.markAllRead(req.currentUser);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    list,
    unreadCount,
    markRead,
    markAllRead
};
