// controllers/learnerController.js
const Learner = require("../models/learnerModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const APIFeatures = require("../utils/apiFeature");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (learner, statusCode, req, res) => {
  const token = signToken(learner._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    sameSite: "None",

    httpOnly: true,
    secure: true || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove password from output
  learner.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      learner,
    },
  });
};

const signup = catchAsync(async (req, res, next) => {
  if (req.user && req.user.role === "schoolAdmin") {
    req.body.schoolID = req.user._id;
  }
  console.log(req.body);
  const username = req.body.schoolID;
  // Check if school with the provided code exists
  const school = await User.findOne({ username: username });
  if (!school) {
    return next(new AppError("Incorrect code provided", 401));
  }
  // Search learners collection based on school ID
  const learners = await Learner.find({ schoolId: school._id });
  if (learners.length < school.point || learners.length === 0) {
    // Create new learner account
    req.body.schoolID = school._id;
    const newLearner = await Learner.create(req.body);
    createSendToken(newLearner, 201, req, res);
  } else {
    return next(
      new AppError("signup limit reached. Contact school admin.", 403)
    );
  }
});

const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1) Check if email and password exist
  if (!username || !password) {
    return next(new AppError("name and password is required", 400));
  }
  // 2) Check if learner exists && password is correct
  const learner = await Learner.findOne({ username }).select("+password");
  console.log("check password", learner);
  if (!learner || !(password === learner.password)) {
    return next(new AppError("Incorrect username or password", 401));
  }
  if (!learner || !learner.isActivated) {
    return next(new AppError("Account Deactivated contact schoolAdmin", 401));
  }
  // 3) If everything ok, send token to client
  createSendToken(learner, 200, req, res);
});

const logout = (req, res) => {
  console.log("hi");
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

  // 3) Check if learner still exists
  const currentLearner = await Learner.findById(decoded.id);
  if (!currentLearner) {
    return next(
      new AppError(
        "The learner belonging to this token does no longer exist.",
        401
      )
    );
  }

  // // 4) Check if learner changed password after the token was issued
  // if (currentLearner.changedPasswordAfter(decoded.iat)) {
  //   return next(
  //     new AppError("Learner recently changed password! Please log in again.", 401)
  //   );
  // }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.learner = currentLearner;
  res.locals.learner = currentLearner;
  next();
});

// Create operation
// const createLearner = catchAsync(async (req, res, next) => {
//   const newLearner = await Learner.create(req.body);
//   res.status(201).json({
//     status: "success",
//     data: newLearner,
//   });
// });

// Read operation - Get all learners
const getAllLearners = catchAsync(async (req, res, next) => {
  try {
    // Initialize APIFeatures with the Course model's query and the request's query string
    const features = new APIFeatures(
      Learner.find(),
      req.query
    ).filterLearnerTeacher(); // Apply filtering
    // Paginate results

    const learners = await features.query;
    // Execute the query
    if (learners.length < 1) {
      return next(new AppError("No Learner signed up yet", 404));
    }

    // Send response with the course list
    res.status(200).json({
      status: "success",
      learners,
    });
  } catch (error) {
    // Handle errors
    return next(new AppError(`Error getting Learners: ${error.message}`, 400));
  }
});

// Read operation - Get learner by ID
const getLearnerById = catchAsync(async (req, res, next) => {
  console.log("hh");
  const learner = await Learner.findById(req.params.id).populate("schoolID");
  if (!learner) {
    return next(new AppError("Learner not found", 404));
  }
  res.status(200).json({
    status: "success",
    learner,
  });
});

// Update operation
const updateLearner = catchAsync(async (req, res, next) => {
  const updatedLearner = await Learner.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!updatedLearner) {
    return next(new AppError("Learner not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: updatedLearner,
  });
});

// Delete operation
const deleteLearner = catchAsync(async (req, res, next) => {
  const deletedLearner = await Learner.findByIdAndDelete(req.params.id);
  if (!deletedLearner) {
    return next(new AppError("Learner not found", 404));
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Fetch top 5 users with highest number of learners
const getTopUsersWithLearners = async (req, res) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "learners",
          localField: "_id",
          foreignField: "schoolID",
          as: "learners",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          learnerCount: { $size: "$learners" },
        },
      },
      { $sort: { learnerCount: -1 } },
      { $limit: 5 },
    ];

    const topUsers = await User.aggregate(pipeline);
    res.status(200).json({
      success: true,
      data: topUsers,
    });
  } catch (err) {
    console.error("Error fetching top users:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  deleteLearner,
  // createLearner,
  getTopUsersWithLearners,
  getAllLearners,
  getLearnerById,
  updateLearner,
  protect,
  logout,
  login,
  signup,
};
