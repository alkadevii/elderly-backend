const express = require("express");
const router = express.Router();

const {
  addVital,
  getVitals,
  getVitalTrends,
  deleteVital,
  getRanges,
} = require("../controllers/vitalController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.post("/", authMiddleware, requireVerified, addVital);
router.get("/", authMiddleware, requireVerified, getVitals);
router.get("/trends", authMiddleware, requireVerified, getVitalTrends);
router.delete("/:id", authMiddleware, requireVerified, deleteVital);
router.get("/ranges", authMiddleware, getRanges);

module.exports = router;
