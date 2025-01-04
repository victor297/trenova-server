const mongoose = require("mongoose");
const desktopSchema = new mongoose.Schema({
  name: String,
  email: String,
  address: String,
  tokenExpiryDate: Date,
  currentNumberOfDevices: Number,
  maxNumberOfDevices: Number,
  authorizedTerms: String,
  token: String,
});

const Desktop = mongoose.model("Desktop", desktopSchema);
module.exports = Desktop;
