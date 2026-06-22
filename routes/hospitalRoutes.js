const express = require("express");
const router = express.Router();

const {
  getHospitals,
  createHospital,
  updateHospital,
  deleteHospital,
  seedHospitals,
} = require("../controllers/hospitalController");

const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly, requireVerified } = authMiddleware;

router.get("/", authMiddleware, requireVerified, getHospitals);
router.post("/", authMiddleware, adminOnly, createHospital);
router.put("/:id", authMiddleware, adminOnly, updateHospital);
router.delete("/:id", authMiddleware, adminOnly, deleteHospital);
router.post("/seed", authMiddleware, adminOnly, seedHospitals);

module.exports = router;
