const crypto = require("crypto");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your school name!"],
  },
  username: { type: String, required: true, unique: true },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  code: {
    type: String,
    required: [true, "only The admin with code!"],
  },
  point: {
    type: Number,
    required: [true, "Max number of user a school can sign up!"],
    default: 100,
  },
  isActivated: {
    type: Boolean,
    require: true,
    default: false,
  },
  availableSpace: {
    type: Number,
    require: true,
    default: 7000,
  },
  usedSpace: {
    type: Number,
    require: true,
    default: 0,
  },
  role: {
    type: String,
    enum: ["admin", "schoolAdmin"],
    required: true,
    default: "schoolAdmin",
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same!",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordResetAttempts: Number,
  active: {
    type: Boolean,
    default: true,
  },
});

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const otp = otpGenerator.generate(6, {
    upperCase: false,
    specialChars: false,
  });
  this.passwordResetAttempts = 0;

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // return resetToken;
  return otp;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
