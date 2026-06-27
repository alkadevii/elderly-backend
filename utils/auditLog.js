const AuditLog = require("../models/AuditLog");

const logAudit = async ({ actor, actorRole, action, targetModel = "", targetId = null, targetUser = null, details = {}, req = null }) => {
  try {
    const actorId = actor?._id || actor?.id || actor;
    if (!actorId) return null;

    return await AuditLog.create({
      actor: actorId,
      actorRole: actorRole || "",
      action,
      targetModel,
      targetId,
      targetUser,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress || "",
      userAgent: req?.headers?.["user-agent"] || "",
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
    return null;
  }
};

module.exports = { logAudit };
