const mongoose = require("mongoose");
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  schoolID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
  role: {
    type: String,
    required: true,
    default: "teacher",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    default: "Trenova12345",
  },
});

const Teacher = mongoose.model("Teacher", teacherSchema);
module.exports = Teacher;
