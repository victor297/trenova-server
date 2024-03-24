const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
  term: { type: Number, required: true },
  class: { type: String, required: true },
  type: {
    type: String,
    enum: ["video", "e-book", "text-content"],
    required: true,
  },
  isPublish: {
    type: Boolean,
    required: true,
    default: false,
  },
  content: [
    {
      week: { type: Number, required: true },

      lessons: [
        {
          number: { type: String, required: true },
          title: { type: String, required: true },
          content: { type: String, required: true },
          // Other lesson-related fields
        },
      ],
      questions: [
        {
          text: { type: String },
          options: [{ type: String }],
          correctOption: { type: Number },
        },
      ],
    },
  ],
});

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
