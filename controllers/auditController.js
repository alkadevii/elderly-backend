const AuditLog = require("../models/AuditLog");

const getAuditLogs = async (req, res) => {
  try {
    const filter = {};

    if (req.query.actor) filter.actor = req.query.actor;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.targetModel) filter.targetModel = req.query.targetModel;
    if (req.query.targetUser) filter.targetUser = req.query.targetUser;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "name email role")
        .populate("targetUser", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};

const getAuditLogStats = async (req, res) => {
  try {
    const [totalLogs, actionCounts, modelCounts] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: "$targetModel", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.status(200).json({
      totalLogs,
      byAction: actionCounts,
      byTargetModel: modelCounts,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch audit stats",
      error: error.message,
    });
  }
};

module.exports = { getAuditLogs, getAuditLogStats };
