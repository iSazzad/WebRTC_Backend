const { smtp } = require("../config/env");

const nodemailer = require("nodemailer");

// Build a transporter. If SMTP credentials are missing we fall back to a
// non-networking transport (jsonTransport) so the app doesn't crash in dev.
function createTransporter() {
  const user = smtp.user;
  const pass = smtp.pass;

  if (user && pass) {
    // Production-like transporter (Gmail service or configure host/port)
    return nodemailer.createTransport({
      service: smtp.service,
      auth: { user, pass },
    });
  }

  // Development fallback: jsonTransport serializes the message instead of
  // sending it. This avoids "Missing credentials for 'PLAIN'" errors when
  // env vars are not set.
  console.warn(
    "⚠️  SMTP credentials not provided (SMTP_USER/SMTP_PASS). Using jsonTransport fallback — emails will not be sent."
  );
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = createTransporter();

/**
 * Send an OTP email
 * @param {string} to - recipient email
 * @param {string} otp - one-time password
 */
async function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: `"WebRTC App" <"no-reply@callapp.com">`,
    to,
    subject: "Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px;">
        <h2 style="color:#4A90E2;">Your Verification Code</h2>
        <p>Hello,</p>
        <p>Your one-time password (OTP) for verification is:</p>
        <h1 style="letter-spacing: 4px;">${otp}</h1>
        <p>This code will expire in <b>15 minutes</b>.</p>
        <br />
        <p>If you didn’t request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    // jsonTransport returns the generated message as `message` or `messageId`
    if (info && info.message) {
      console.log(`📧 (dev) OTP email prepared for ${to}:`, info.message);
    } else {
      console.log(`📧 OTP email sent to ${to}`, info.messageId || info);
    }

    return info;
  } catch (err) {
    // Re-throw with a clearer message for callers, but keep original
    // stack for debugging.
    console.error(
      "❌ Failed to send OTP email:",
      err && err.message ? err.message : err
    );
    throw new Error(
      `Failed to send OTP email: ${
        err && err.message ? err.message : String(err)
      }`
    );
  }
}

module.exports = { sendOtpEmail };
