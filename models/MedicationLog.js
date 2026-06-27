const mongoose = require("mongoose");

const medicationLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  medication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medication",
    required: true,
  },
  taken: {
    type: Boolean,
    required: true,
  },
  status: {
    type: String,
    enum: ["taken", "missed", "skipped"],
    default: "taken",
  },
  scheduledTime: {
    type: String,
    required: true,
  },
  actualTime: {
    type: Date,
    default: Date.now,
  },
  date: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    default: "",
  },
}, {
  timestamps: true,
});

medicationLogSchema.index({ user: 1, date: -1 });
medicationLogSchema.index({ medication: 1, date: 1, scheduledTime: 1 }, { unique: true });

module.exports = mongoose.model("MedicationLog", medicationLogSchema);
