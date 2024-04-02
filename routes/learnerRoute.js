// routes/learnerRoutes.js
const express = require("express");
const {
  // protect,
  logout,
  login,
  signup,
  getAllLearners,
  getLearnerById,
  updateLearner,
  deleteLearner,
  getTopUsersWithLearners,
  updateProfile,
} = require("../controllers/learnerController");
const { protect } = require("../controllers/authController");

const router = express.Router();
router.post("/", signup);
router.post("/login", login);
router.get("/logout/:id", logout);
router.get("/", getAllLearners);
router.get("/topschools", getTopUsersWithLearners);
router.get("/:id", getLearnerById);
router.patch("/profile/:id", updateProfile);
router.use(protect);
router.patch("/:id", updateLearner);
router.delete("/:id", deleteLearner);

module.exports = router;
