const express = require("express");
const router = express.Router();

const { exportHealthSummary } = require("../controllers/exportController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.get("/health-summary", authMiddleware, requireVerified, exportHealthSummary);

module.exports = router;
