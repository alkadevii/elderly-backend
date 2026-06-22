const express = require("express");
const router = express.Router();

const {
  addContact,
  getContacts,
  updateContact,
  deleteContact,
} = require("../controllers/emergencyContactController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified } = authMiddleware;

router.post("/", authMiddleware, requireVerified, addContact);
router.get("/", authMiddleware, requireVerified, getContacts);
router.put("/:id", authMiddleware, requireVerified, updateContact);
router.delete("/:id", authMiddleware, requireVerified, deleteContact);

module.exports = router;
