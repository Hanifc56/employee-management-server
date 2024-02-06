const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// inital oprations
app.get("/", (req, res) => {
  res.send("Employee managament server is runnig!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
