const express = require("express");
const {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
  protect,
  users,
  user,
  updateUser,
  deleteUser,
} = require("./../controllers/authController");
// const { createAdmin } = require("../controllers/userController");

const router = express.Router();

router.post("/signup", signup);
// router.post("/createAdmin", createAdmin);
router.post("/login", login);
router.get("/logout", logout);
router.use(protect);
router.get("/", users);
router.get("/:id", user);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

router.post("/forgotPassword", forgotPassword);
router.patch("/resetPassword/:otp", resetPassword);

// Protect all routes after this middleware

router.patch("/updateMyPassword", updatePassword);
// router.get("/me", userController.getMe, userController.getUser);

module.exports = router;
