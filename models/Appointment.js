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
        "approved",
        "scheduled",
        "completed",
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

  }, {
    timestamps: true,
  });

module.exports = mongoose.model(
  "Appointment",
  appointmentSchema
);