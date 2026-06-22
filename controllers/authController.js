const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwtUtils");

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      profileCompleted: false,
      verificationStatus: "pending",
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        identificationMark: user.identificationMark,
        emergencyNotes: user.emergencyNotes,
        phone: user.phone,
        address: user.address,
        emergencyContact: user.emergencyContact,
        medicalConditions: user.medicalConditions,
        profileCompleted: user.profileCompleted,
        verificationStatus: user.verificationStatus,
        assignedStaff: user.assignedStaff,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("assignedStaff", "name email phone");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User retrieved successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve user",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = {
      ...req.body,
      profileCompleted: true,
    };

    delete updateData.password;
    delete updateData.role;
    delete updateData.verificationStatus;
    delete updateData.verifiedBy;
    delete updateData.assignedStaff;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Profile update failed",
      error: error.message,
    });
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "staff",
      profileCompleted: true,
      verificationStatus: "verified",
    });

    res.status(201).json({
      message: "Staff account created successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create staff",
      error: error.message,
    });
  }
};

const verifyProfile = async (req, res) => {
  try {
    const { status, verificationNotes } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'verified' or 'rejected'",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        verificationStatus: status,
        verifiedBy: req.user.id,
        verificationNotes: verificationNotes || "",
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: `Profile ${status}`,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to verify profile",
      error: error.message,
    });
  }
};

const assignStaff = async (req, res) => {
  try {
    const { staffId } = req.body;

    const staff = await User.findOne({ _id: staffId, role: "staff" });
    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { assignedStaff: staffId },
      { new: true }
    )
      .select("-password")
      .populate("assignedStaff", "name email phone");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Staff assigned successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to assign staff",
      error: error.message,
    });
  }
};

const getPendingProfiles = async (req, res) => {
  try {
    const users = await User.find({
      profileCompleted: true,
      verificationStatus: "pending",
    })
      .select("-password")
      .sort({ updatedAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch pending profiles",
      error: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, verificationStatus } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    const users = await User.find(filter)
      .select("-password")
      .populate("assignedStaff", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

const getStaffList = async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" })
      .select("-password")
      .sort({ name: 1 });

    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch staff list",
      error: error.message,
    });
  }
};

const getAssignedUsers = async (req, res) => {
  try {
    const users = await User.find({ assignedStaff: req.user.id })
      .select("-password")
      .sort({ name: 1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch assigned users",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  createStaff,
  verifyProfile,
  assignStaff,
  getPendingProfiles,
  getAllUsers,
  getStaffList,
  getAssignedUsers,
};
