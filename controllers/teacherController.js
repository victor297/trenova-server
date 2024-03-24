const Teacher = require("../models/teacherModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const APIFeatures = require("../utils/apiFeature");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (teacher, statusCode, req, res) => {
  const token = signToken(teacher._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove password from output
  teacher.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      teacher,
    },
  });
};

const signup = catchAsync(async (req, res, next) => {
  console.log("users", req.user);
  req.body.schoolID = req.user._id;

  const newTeacher = await Teacher.create(req.body);
  res.status(201).json({
    status: "success",
    data: newTeacher,
  });
  // createSendToken(newTeacher, 201, req, res);
});

const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1) Check if email and password exist
  if (!username || !password) {
    return next(new AppError(" username and password is required", 400));
  }
  // 2) Check if teacher exists && password is correct
  const teacher = await Teacher.findOne({ username }).select("+password");
  console.log("check password", teacher);
  if (!teacher || !(password === teacher.password)) {
    return next(new AppError("Incorrect username or password", 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(teacher, 200, req, res);
});

const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if teacher still exists
  const currentTeacher = await User.findById(decoded.id);
  if (!currentTeacher) {
    return next(
      new AppError(
        "The teacher belonging to this token does no longer exist.",
        401
      )
    );
  }

  // // 4) Check if teacher changed password after the token was issued
  // if (currentTeacher.changedPasswordAfter(decoded.iat)) {
  //   return next(
  //     new AppError("Teacher recently changed password! Please log in again.", 401)
  //   );
  // }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.teacher = currentTeacher;
  res.locals.teacher = currentTeacher;
  next();
});

// // Create operation
// const createTeacher = catchAsync(async (req, res, next) => {
//   const newTeacher = await Teacher.create(req.body);
//   res.status(201).json({
//     status: "success",
//     data: newTeacher,
//   });
// });

// Read operation - Get all teachers
const getAllTeachers = catchAsync(async (req, res, next) => {
  try {
    // Initialize APIFeatures with the Course model's query and the request's query string
    const features = new APIFeatures(
      Teacher.find(),
      req.query
    ).filterLearnerTeacher(); // Apply filtering
    // Paginate results

    const teachers = await features.query;
    // Execute the query
    if (teachers.length < 1) {
      return next(
        new AppError("No Teachers... kindly signed up Teachers", 404)
      );
    }

    // Send response with the course list
    res.status(200).json({
      status: "success",
      teachers,
    });
  } catch (error) {
    // Handle errors
    return next(new AppError(`Error getting teachers: ${error.message}`, 400));
  }
});

// Read operation - Get teacher by ID
const getTeacherById = catchAsync(async (req, res, next) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) {
    return next(new AppError("Teacher not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: teacher,
  });
});

// Update operation
const updateTeacher = catchAsync(async (req, res, next) => {
  const updatedTeacher = await Teacher.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!updatedTeacher) {
    return next(new AppError("Teacher not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: updatedTeacher,
  });
});

// Delete operation
const deleteTeacher = catchAsync(async (req, res, next) => {
  const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);
  if (!deletedTeacher) {
    return next(new AppError("Teacher not found", 404));
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});

module.exports = {
  // createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  protect,
  logout,
  login,
  signup,
};
