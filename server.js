const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend Connected Successfully!" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/emergency-contacts", require("./routes/emergencyContactRoutes"));
app.use("/api/medical-conditions", require("./routes/medicalConditionRoutes"));
app.use("/api/medications", require("./routes/medicationRoutes"));
app.use("/api/vitals", require("./routes/vitalRoutes"));
app.use("/api/hospitals", require("./routes/hospitalRoutes"));
app.use("/api/export", require("./routes/exportRoutes"));
app.use("/api/medication-logs", require("./routes/medicationLogRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/audit-logs", require("./routes/auditRoutes"));
app.use("/api/staff", require("./routes/staffRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
