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
    enum: ["admin", "user"],
    default: "user",
  },

  profileImage: {
    type: String,
    default: "",
  },

  age: {
    type: Number,
  },

  phone: {
    type: String,
  },

  address: {
    type: String,
  },

  emergencyContact: {
    type: String,
  },

  medicalConditions: {
    type: String,
  },

  profileCompleted: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("User", userSchema);