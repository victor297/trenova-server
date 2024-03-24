// routes/teacherRoutes.js
const express = require("express");
const {
  // protect,
  logout,
  login,
  signup,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacherController");
const { protect } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.get("/logout", logout);
router.use(protect);
router.post("/", signup);
router.get("/", getAllTeachers);
router.get("/:id", getTeacherById);
router.patch("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);

module.exports = router;
