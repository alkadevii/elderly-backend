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

    status: {
      type: String,
      enum: [
        "scheduled",
        "completed",
        "cancelled"
      ],
      default: "scheduled",
    },
  });

module.exports = mongoose.model(
  "Appointment",
  appointmentSchema
);