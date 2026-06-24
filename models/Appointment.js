const mongoose = require("mongoose");

const appointmentSchema =
  new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    doctorName: String,

    hospital: String,

    appointmentDate: Date,

    reason: String,

    status: {
      type: String,
      enum: [
        "pending",
        "pending_confirmation",
        "user_confirmed",
        "scheduled",
        "awaiting_feedback",
        "feedback_provided",
        "completed",
        "cancellation_requested",
        "cancelled",
        "rejected"
      ],
      default: "pending",
    },

    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewNotes: String,

    reviewedAt: Date,

    confirmationNotes: String,

    confirmedAt: Date,

    tokenNumber: String,

    finalNotes: String,

    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    finalizedAt: Date,

    feedbackNotes: String,

    feedbackProvidedAt: Date,

    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    completedAt: Date,

    cancelledBy: {
      type: String,
      enum: ["user", "staff", "admin"],
      default: null,
    },

    previousStatus: {
      type: String,
      default: null,
    },

  }, {
    timestamps: true,
  });

module.exports = mongoose.model(
  "Appointment",
  appointmentSchema
);