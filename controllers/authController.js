const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Email = require("./../utils/email");
const otpGenerator = require("otp-generator");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    sameSite: "None",
    httpOnly: true,
    secure: true || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const otp = otpGenerator.generate(8, {
    upperCase: false,
    specialChars: false,
  });
  const url = `${req.protocol}://${req.get("host")}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1) Check if email and password exist
  if (!username || !password) {
    return next(new AppError("username and password is required", 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ username }).select("+password");
  console.log("check password", user);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect username or password", 401));
  }
  if (!user || !user.isActivated) {
    return next(new AppError("Account Deactivated contact Trenova", 401));
  }
  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    sameSite: "None",

    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  // console.log("token", req.cookies.jwt);
  // console.log("tokencokkie", req.cookies);
  // console.log("Reqcokkie", req);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // console.log("token", req.cookies.jwt);

    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    // console.log("token1", req.cookies.jwt);
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({
    email: req.body.email,
    client: req.body.client,
  });
  if (!user) {
    return next(
      new AppError("There is no user with email address and client name.", 404)
    );
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    await new Email(user, resetToken).sendPasswordReset();
    res.status(200).json({
      status: "success",
      message: "otp sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const email = req.body.email;
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.otp)
    .digest("hex");

  const user = await User.findOne({
    email,
  });
  // console.log("user", user);
  if (user.passwordResetAttempts >= 3) {
    return next(
      new AppError(
        "Maximum OTP attempts reached. Please request a new OTP.",
        400
      )
    );
  }

  user.passwordResetAttempts += 1;
  await user.save({ validateBeforeSave: false });
  if (
    !user ||
    user.passwordResetToken !== hashedToken ||
    user.passwordResetExpires < Date.now()
  ) {
    return next(new AppError("Invalid OTP or OTP has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetAttempts = 0;
  await user.save();
  createSendToken(user, 200, req, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});

const users = catchAsync(async (req, res, next) => {
  // console.log("users", req.user);
  const users = await User.find();
  res.status(200).json({
    users,
  });
});

const user = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// Update operation
const updateUser = catchAsync(async (req, res, next) => {
  // console.log("req.params.id)", req.params.id);
  // console.log("req.body", req.body);
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if the password field is present and not empty
    if (req.body.password) {
      // If password is present, update the user object directly
      for (const key in req.body) {
        if (req.body.hasOwnProperty(key)) {
          user[key] = req.body[key];
        }
      }
      user.passwordConfirm = req.body.password;
      const updatedUser = await user.save();
      // Save the updated user

      res.status(200).json({
        status: "success",
        data: updatedUser,
      });
    } else {
      // If password is not present or empty, use findByIdAndUpdate
      delete req.body.password;
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      return res.status(200).json({
        status: "success",
        data: updatedUser,
      });
    }
  } catch (error) {
    console.error("Failed to update user:", error);
    return next(new AppError("Failed to update user", 500));
  }
});
const deleteUser = catchAsync(async (req, res, next) => {
  const deleteUser = await User.findByIdAndDelete(req.params.id);
  if (!deleteUser) {
    return next(new AppError("Teacher not found", 404));
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});

module.exports = {
  updatePassword,
  resetPassword,
  forgotPassword,
  protect,
  users,
  user,
  logout,
  login,
  signup,
  updateUser,
  deleteUser,
};
