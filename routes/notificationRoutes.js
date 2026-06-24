const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.get("/", authMiddleware, requireVerified, getNotifications);
router.patch("/:id/read", authMiddleware, requireVerified, markNotificationRead);
router.post("/read-all", authMiddleware, requireVerified, markAllNotificationsRead);

module.exports = router;
