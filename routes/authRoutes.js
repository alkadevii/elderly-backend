const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  createStaff,
  verifyProfile,
  assignStaff,
  getPendingProfiles,
  getAllUsers,
  getStaffList,
  getAssignedUsers,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const { adminOnly } = authMiddleware;

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", authMiddleware, getCurrentUser);
router.put("/profile", authMiddleware, updateProfile);

router.post("/create-staff", authMiddleware, adminOnly, createStaff);
router.put("/verify-profile/:userId", authMiddleware, adminOnly, verifyProfile);
router.put("/assign-staff/:userId", authMiddleware, adminOnly, assignStaff);
router.get("/pending-profiles", authMiddleware, adminOnly, getPendingProfiles);
router.get("/users", authMiddleware, adminOnly, getAllUsers);
router.get("/staff", authMiddleware, getStaffList);

router.get("/assigned-users", authMiddleware, getAssignedUsers);

module.exports = router;
