const express = require("express");
const router = express.Router();

const { createReview, getReviews, getStaffRating } = require("../controllers/reviewController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireVerified, adminOnly } = authMiddleware;

router.post("/", authMiddleware, requireVerified, createReview);
router.get("/", authMiddleware, getReviews);
router.get("/rating/:staffId", authMiddleware, getStaffRating);

module.exports = router;
