const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["admin", "user", "staff"],
    default: "user",
  },

  profileCompleted: {
    type: Boolean,
    default: false,
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  verificationNotes: String,

  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  profileImage: String,

  dateOfBirth: Date,

  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },

  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },

  identificationMark: String,

  phone: String,

  address: String,

  emergencyNotes: String,

}, {
  timestamps: true,
});

module.exports = mongoose.model(
  "User",
  userSchema
);