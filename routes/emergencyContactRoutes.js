const express = require("express");
const router = express.Router();

const {
  addContact,
  getContacts,
  updateContact,
  deleteContact,
} = require("../controllers/emergencyContactController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, addContact);
router.get("/", authMiddleware, getContacts);
router.put("/:id", authMiddleware, updateContact);
router.delete("/:id", authMiddleware, deleteContact);

module.exports = router;
