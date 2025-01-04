const express = require("express");
const {
  createDesktop,
  getAllDesktops,
  getDesktop,
  updateDesktop,
  deleteDesktop,
  loginDesktop,
} = require("./../controllers/desktopController");

const router = express.Router();

// Define routes
router.post("/create", createDesktop); // Create a desktop
router.get("/", getAllDesktops); // Get all desktops
router.get("/:id", getDesktop); // Get a single desktop by ID
router.patch("/:id", updateDesktop); // Update a desktop by ID
router.delete("/:id", deleteDesktop); // Delete a desktop by ID
router.post("/login", loginDesktop); // Login and validate devices

module.exports = router;
