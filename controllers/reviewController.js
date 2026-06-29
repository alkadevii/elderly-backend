const StaffReview = require("../models/StaffReview");
const User = require("../models/User");
const { logAudit } = require("../utils/auditLog");
const { createNotification } = require("./notificationController");

const createReview = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only patients can submit reviews" });
    }

    const user = await User.findById(req.user.id);

    if (!user.assignedStaff) {
      return res.status(400).json({ message: "No staff member is assigned to you" });
    }

    const { rating, comments, periodStart, periodEnd } = req.body;

    if (!rating) {
      return res.status(400).json({ message: "rating is required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
    }

    const now = new Date();
    const autoPeriodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const autoPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const review = await StaffReview.create({
      user: req.user.id,
      staff: user.assignedStaff,
      rating,
      comments: comments || "",
      periodStart: periodStart || autoPeriodStart,
      periodEnd: periodEnd || autoPeriodEnd,
    });

    await createNotification({
      user: user.assignedStaff,
      type: "staff_review",
      title: "New feedback received",
      message: `A patient has submitted a ${rating}-star review for you.`,
      status: "review_submitted",
    });

    await logAudit({
      actor: req.user.id,
      actorRole: "user",
      action: "staff.review_submitted",
      targetModel: "StaffReview",
      targetId: review._id,
      targetUser: user.assignedStaff,
      details: { rating, periodStart, periodEnd },
      req,
    });

    res.status(201).json({ message: "Review submitted", review });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
};

const getReviews = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "admin") {
      if (req.query.staffId) filter.staff = req.query.staffId;
      if (req.query.userId) filter.user = req.query.userId;
    } else if (req.user.role === "staff") {
      filter.staff = req.user.id;
    } else {
      filter.user = req.user.id;
    }

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const populateUserOpts =
      req.user.role === "staff" ? null : { path: "user", select: "name email" };

    const query = StaffReview.find(filter)
      .populate("staff", "name email")
      .sort({ createdAt: -1 })
      .limit(limit);

    if (populateUserOpts) {
      query.populate(populateUserOpts);
    }

    const reviews = await query;

    const result = reviews.map((r) => {
      const obj = r.toObject();
      if (req.user.role === "staff") {
        obj.user = { _id: r.user?._id, name: "Anonymous" };
      }
      return obj;
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
};

const getStaffRating = async (req, res) => {
  try {
    const staffId = req.params.staffId || req.query.staffId;

    if (!staffId) {
      return res.status(400).json({ message: "staffId is required" });
    }

    if (req.user.role === "staff" && req.user.id !== staffId) {
      return res.status(403).json({ message: "You can only view your own rating" });
    }

    const reviews = await StaffReview.find({ staff: staffId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const anonymized =
      req.user.role === "staff"
        ? reviews.map((r) => {
            const obj = r.toObject();
            obj.user = { _id: r.user?._id, name: "Anonymous" };
            return obj;
          })
        : reviews;

    const ratings = anonymized.map((r) => r.rating);
    const avg = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

    const breakdown = {};
    for (let i = 1; i <= 5; i++) {
      breakdown[`${i}star`] = ratings.filter((r) => r === i).length;
    }

    res.status(200).json({
      staffId,
      totalReviews: anonymized.length,
      averageRating: avg,
      breakdown,
      reviews: anonymized,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rating", error: error.message });
  }
};

module.exports = { createReview, getReviews, getStaffRating };
