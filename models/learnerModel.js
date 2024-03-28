const mongoose = require("mongoose");

const learnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  class: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  profileImg: { type: String },
  schoolID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  maxDevice: { type: Number, required: true, default: 0 },
  role: {
    type: String,
    required: true,
    default: "learner",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    default: "Trenova12345",
  },
  isActivated: {
    type: Boolean,
    require: true,
    default: false,
  },
});

const Learner = mongoose.model("Learner", learnerSchema);

module.exports = Learner;
