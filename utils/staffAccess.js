const User = require("../models/User");

const getStaffUserFilter = async (staffId, targetUserId) => {
  if (targetUserId) {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return null;
    if (
      targetUser.assignedStaff &&
      targetUser.assignedStaff.toString() === staffId.toString()
    ) {
      return { user: targetUserId };
    }
    return null;
  }

  const assignedUsers = await User.find({ assignedStaff: staffId }).select("_id");
  return { user: { $in: assignedUsers.map((u) => u._id) } };
};

module.exports = { getStaffUserFilter };
