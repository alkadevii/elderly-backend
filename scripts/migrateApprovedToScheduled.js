require("dotenv").config();
const mongoose = require("mongoose");

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    const result = await mongoose.connection.collection("appointments").updateMany(
      { status: "approved" },
      { $set: { status: "scheduled", updatedAt: new Date() } }
    );

    console.log(
      `Migration complete. Matched ${result.matchedCount}, modified ${result.modifiedCount} appointment(s).`
    );
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
