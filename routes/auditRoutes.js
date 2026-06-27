const express = require("express");
const router = express.Router();

const {
  getAuditLogs,
  getAuditLogStats,
} = require("../controllers/auditController");

const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly } = authMiddleware;

router.get("/", authMiddleware, adminOnly, getAuditLogs);
router.get("/stats", authMiddleware, adminOnly, getAuditLogStats);

module.exports = router;
