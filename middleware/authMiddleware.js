const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const requireVerified = async (req, res, next) => {
  try {
    if (req.user.role === "admin" || req.user.role === "staff") {
      return next();
    }

    const user = await User.findById(req.user.id).select("verificationStatus assignedStaff");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verificationStatus !== "verified") {
      return res.status(403).json({
        message: "Your profile has not been verified yet. Please wait for admin verification.",
      });
    }

    if (!user.assignedStaff) {
      return res.status(403).json({
        message: "No staff member has been assigned to you yet. Please wait for staff assignment.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Verification check failed",
      error: error.message,
    });
  }
};

module.exports = authMiddleware;
module.exports.adminOnly = adminOnly;
module.exports.requireVerified = requireVerified;
