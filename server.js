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

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
