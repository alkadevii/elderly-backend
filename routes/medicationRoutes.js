const express = require("express");
const router = express.Router();

const {
  addMedication,
  getMedications,
  updateMedication,
  deleteMedication,
} = require("../controllers/medicationController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, addMedication);
router.get("/", authMiddleware, getMedications);
router.put("/:id", authMiddleware, updateMedication);
router.delete("/:id", authMiddleware, deleteMedication);

module.exports = router;
