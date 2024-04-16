const nodemailer = require("nodemailer");

module.exports = class Email {
  constructor(user, resetToken) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.resetToken = resetToken;
    this.from = `Trenova Support <noreply@example.com>`; // Use a generic or noreply email
  }

  newTransport() {
    return nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(subject, template) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html: template,
    };
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to Trenova!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset OTP",
      `Forgot your password? your One-Time password to reset your password is ${this.resetToken} (valid for only 10 minutes)`
    );
  }
};
