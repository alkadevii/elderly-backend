const mongoose = require("mongoose");

const staffReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comments: {
    type: String,
    default: "",
  },
  periodStart: {
    type: String,
    required: true,
  },
  periodEnd: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

staffReviewSchema.index({ staff: 1, createdAt: -1 });
staffReviewSchema.index({ user: 1 });

module.exports = mongoose.model("StaffReview", staffReviewSchema);
