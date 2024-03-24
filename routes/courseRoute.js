const express = require("express");
const {
  createCourse,
  getCourseById,
  getAllCourses,
  updateCourse,
  deleteCourse,
} = require("./../controllers/courseController");
const { protect } = require("./../controllers/authController");

const router = express.Router();

// Public routes
router.get("/", getAllCourses); // Get all courses
router.get("/:id", getCourseById); // Get course by ID

// Protected routes (requires authentication)
router.use(protect);
router.post("/", createCourse); // Create a new course
router.patch("/:id", updateCourse); // Update a course
router.delete("/:id", deleteCourse); // Delete a course

module.exports = router;
