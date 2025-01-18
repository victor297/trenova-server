const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const mongoose = require("mongoose");

const Course = require("../models/courseModel"); // Assuming your schema is in a file named "Course.js" and located in a "models" folder
const APIFeatures = require("../utils/apiFeature");
const User = require("../models/userModel");

// Create operation
const createCourse = catchAsync(async (req, res, next) => {
  const courseData = req.body;
  if (req?.user?.role === "admin") {
    req.body.school = "6603e6e06e7e286c38da1ea1";
  }
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the user and get the current usedSpace
      const user = await User.findById(courseData.school).session(session);
      if (!user) {
        throw new Error("User not found");
      }

      const newUsedSpace = user.usedSpace + courseData.uploadSize;

      // Update the user's usedSpace with the new value
      await User.findByIdAndUpdate(
        courseData.school,
        { usedSpace: newUsedSpace },
        { new: true, session }
      );

      // Create the new course within the same transaction
      const newCourse = await Course.create([courseData], { session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        status: "success",
        data: newCourse,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    return next(new AppError(`Error creating course: ${error.message}`, 400));
  }
});

// Read operation - Get all courses
const getAllCourses = catchAsync(async (req, res, next) => {
  try {
    // Initialize APIFeatures with the Course model's query and the request's query string
    const features = new APIFeatures(Course.find(), req.query)
      .filter() // Apply filtering
      .sort(); // Apply sorting
    // .limitfields(); // Limit fields
    // .paginate(); // Paginate results

    const courses = await features.query;
    // Execute the query
    if (courses.length < 1) {
      return next(new AppError("Course not available for your level", 404));
    }
    // Check if the course list is empty
    if (courses.length === 0) {
      // Send null response
      return res.status(200).json({
        status: "success",
        data: null,
      });
    }

    // Send response with the course list
    res.status(200).json({
      status: "success",
      data: courses,
    });
  } catch (error) {
    // Handle errors
    return next(new AppError(`Error getting courses: ${error.message}`, 400));
  }
});

// Read operation
const getCourseById = catchAsync(async (req, res, next) => {
  const courseId = req.params.id;
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError("Course not found", 404));
    }
    res.status(200).json({
      status: "success",
      data: course,
    });
  } catch (error) {
    return next(new AppError(`Error getting course: ${error.message}`, 400));
  }
});

// Update operation
const updateCourse = catchAsync(async (req, res, next) => {
  const courseId = req.params.id;
  const newData = req.body;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the course to get the school (user) associated with it
      const course = await Course.findById(courseId).session(session);
      if (!course) {
        throw new Error("Course not found");
      }

      // Calculate the new usedSpace for the associated user
      const user = await User.findById(course.school).session(session);
      if (!user) {
        throw new Error("User not found");
      }
      const newUsedSpace = user.usedSpace + newData.uploadSize;

      // Update the user's usedSpace with the new value
      await User.findByIdAndUpdate(
        course.school,
        { usedSpace: newUsedSpace },
        { new: true, session }
      );

      // Update the course data
      const updatedCourse = await Course.findByIdAndUpdate(courseId, newData, {
        new: true,
        session,
      });
      if (!updatedCourse) {
        throw new Error("Course not found");
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        status: "success",
        data: updatedCourse,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError(`Error updating course: ${error.message}`, 400));
    }
  } catch (error) {
    return next(new AppError(`Error updating course: ${error.message}`, 400));
  }
});

// Delete operation
const deleteCourse = catchAsync(async (req, res, next) => {
  const courseId = req.params.id;
  const { deleteSize } = req.body;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the course to get the school (user) associated with it
      const course = await Course.findById(courseId).session(session);
      if (!course) {
        throw new Error("Course not found");
      }

      // Calculate the new usedSpace for the associated user
      const user = await User.findById(course.school).session(session);
      if (!user) {
        throw new Error("User not found");
      }
      const newUsedSpace = user.usedSpace - deleteSize;

      // Update the user's usedSpace with the new value
      await User.findByIdAndUpdate(
        course.school,
        { usedSpace: newUsedSpace },
        { new: true, session }
      );

      // Delete the course
      const deletedCourse = await Course.findByIdAndDelete(courseId).session(
        session
      );
      if (!deletedCourse) {
        throw new Error("Course not found");
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        status: "success",
        data: deletedCourse,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError(`Error deleting course: ${error.message}`, 400));
    }
  } catch (error) {
    return next(new AppError(`Error deleting course: ${error.message}`, 400));
  }
});

module.exports = {
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  getAllCourses,
};
