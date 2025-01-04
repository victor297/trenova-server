const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Desktop = require("../models/desktopModel");

// Create a desktop
const createDesktop = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    address,
    tokenExpiryDate,
    maxNumberOfDevices,
    authorizedTerms,
  } = req.body;

  const token = Math.random().toString(16).slice(2, 18);

  const desktop = new Desktop({
    name,
    email,
    address,
    tokenExpiryDate,
    currentNumberOfDevices: 0,
    maxNumberOfDevices,
    authorizedTerms,
    token,
  });

  try {
    const savedDesktop = await desktop.save();
    res.status(201).json({
      status: "success",
      data: savedDesktop,
    });
  } catch (err) {
    return next(new AppError("Failed to create desktop", 400));
  }
});

// Read all desktops
const getAllDesktops = catchAsync(async (req, res, next) => {
  try {
    const desktops = await Desktop.find();
    res.status(200).json({
      status: "success",
      results: desktops.length,
      data: desktops,
    });
  } catch (err) {
    return next(new AppError("Failed to fetch desktops", 500));
  }
});

// Read a single desktop
const getDesktop = catchAsync(async (req, res, next) => {
  try {
    const desktop = await Desktop.findById(req.params.id);
    if (!desktop) {
      return next(new AppError("Desktop not found", 404));
    }
    res.status(200).json({
      status: "success",
      data: desktop,
    });
  } catch (err) {
    return next(new AppError("Failed to fetch desktop", 500));
  }
});

// Update a desktop
const updateDesktop = catchAsync(async (req, res, next) => {
  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined && req.body[key] !== "") {
      updates[key] = req.body[key];
    }
  });

  try {
    const desktop = await Desktop.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!desktop) {
      return next(new AppError("Desktop not found", 404));
    }
    res.status(200).json({
      status: "success",
      data: desktop,
    });
  } catch (err) {
    return next(new AppError("Failed to update desktop", 400));
  }
});

// Delete a desktop
const deleteDesktop = catchAsync(async (req, res, next) => {
  try {
    const desktop = await Desktop.findByIdAndDelete(req.params.id);
    if (!desktop) {
      return next(new AppError("Desktop not found", 404));
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    return next(new AppError("Failed to delete desktop", 500));
  }
});

// Login and validate devices
const loginDesktop = catchAsync(async (req, res, next) => {
  const desktop = await Desktop.findOne({ email: req.body.email });
  if (!desktop) {
    return next(new AppError("Desktop not found", 404));
  }

  if (desktop.currentNumberOfDevices >= desktop.maxNumberOfDevices) {
    return next(new AppError("Maximum number of devices reached", 403));
  }

  desktop.currentNumberOfDevices += 1;
  await desktop.save();

  res.status(200).json({
    status: "success",
    data: {
      name: desktop.name,
      email: desktop.email,
      address: desktop.address,
      tokenExpiryDate: desktop.tokenExpiryDate,
      currentNumberOfDevices: desktop.currentNumberOfDevices,
      maxNumberOfDevices: desktop.maxNumberOfDevices,
      authorizedTerms: desktop.authorizedTerms,
    },
  });
});

module.exports = {
  createDesktop,
  getAllDesktops,
  getDesktop,
  updateDesktop,
  deleteDesktop,
  loginDesktop,
};
