const express = require("express");
const router = express.Router();

const { getDashboard, getPerformance } = require("../controllers/staffController");

const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly } = authMiddleware;

router.get("/dashboard", authMiddleware, getDashboard);
router.get("/performance", authMiddleware, adminOnly, getPerformance);

module.exports = router;
