const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected route - requires JWT token
router.get("/me", authMiddleware, getCurrentUser);

router.put("/profile/:id", updateProfile);

module.exports = router;
