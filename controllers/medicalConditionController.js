const MedicalCondition =
  require(
    "../models/MedicalCondition"
  );

const addCondition = async (
  req,
  res
) => {
  try {
    const condition =
      await MedicalCondition.create({
        user: req.user.id,
        ...req.body,
      });

    res.status(201).json({
      message:
        "Condition added successfully",
      condition,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to add condition",
      error: error.message,
    });
  }
};

const getConditions = async (
  req,
  res
) => {
  try {
    const conditions =
      await MedicalCondition.find({
        user: req.user.id,
      });

    res.status(200).json(
      conditions
    );
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to fetch conditions",
      error: error.message,
    });
  }
};

const updateCondition = async (
  req,
  res
) => {
  try {
    const condition =
      await MedicalCondition.findOneAndUpdate(
        {
          _id: req.params.id,
          user: req.user.id,
        },
        req.body,
        { new: true }
      );

    if (!condition) {
      return res.status(404).json({
        message:
          "Condition not found",
      });
    }

    res.status(200).json(
      condition
    );
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to update condition",
      error: error.message,
    });
  }
};

const deleteCondition = async (
  req,
  res
) => {
  try {
    const condition =
      await MedicalCondition.findOneAndDelete(
        {
          _id: req.params.id,
          user: req.user.id,
        }
      );

    if (!condition) {
      return res.status(404).json({
        message:
          "Condition not found",
      });
    }

    res.status(200).json({
      message:
        "Condition deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to delete condition",
      error: error.message,
    });
  }
};

module.exports = {
  addCondition,
  getConditions,
  updateCondition,
  deleteCondition,
};