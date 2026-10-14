const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASSWORD;

    if (!user || !pass) {
      throw new Error("MAIL_USER or MAIL_PASSWORD is missing in environment variables");
    }

    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = port === 465;

    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

/**
 * Clean & resolve from header for Gmail SMTP.
 * Preserves custom display names if provided, but ensures
 * the sender address uses the authenticated MAIL_USER.
 */
function resolveFrom(from) {
  const mailUser = process.env.MAIL_USER;
  if (!from || from.includes("@resend.dev")) {
    return `"CoderHaveli" <${mailUser}>`;
  }
  if (from.includes(mailUser)) {
    return from;
  }
  const match = from.match(/^"?([^"<]+)"?\s*<.*>$/);
  if (match) {
    return `"${match[1].trim()}" <${mailUser}>`;
  }
  return `"CoderHaveli" <${mailUser}>`;
}

/**
 * Mailer service
 * Compatible with transporter.sendMail({ from, to, subject, html, text })
 */
const Mailer = {
  get transporter() {
    return getTransporter();
  },

  async sendMail({ from, to, subject, html, text }) {
    const client = getTransporter();
    const recipient = Array.isArray(to) ? to.join(", ") : to;
    const sender = resolveFrom(from);

    return await client.sendMail({
      from: sender,
      to: recipient,
      subject,
      html,
      text,
    });
  },

  verify(callback) {
    return getTransporter().verify(callback);
  },
};

module.exports = Mailer;