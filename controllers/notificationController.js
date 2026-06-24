const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  try {
    const filter = { user: req.user.id };

    const unreadOnly = req.query.unreadOnly;
    if (unreadOnly === "true" || unreadOnly === "1") {
      filter.read = false;
    }

    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true, updatedAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true, updatedAt: new Date() }
    );

    res.status(200).json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

const createNotification = async ({
  user,
  title,
  message = "",
  appointment = null,
  status = null,
  type = "appointment",
}) => {
  if (!user) return null;
  try {
    const userId = user._id || user;
    return await Notification.create({
      user: userId,
      title,
      message,
      appointment,
      status,
      type,
    });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
    return null;
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
};
