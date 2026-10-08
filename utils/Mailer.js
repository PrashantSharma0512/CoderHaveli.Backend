const { Resend } = require("resend");

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is missing in environment variables");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const defaultFrom =
  process.env.RESEND_FROM_EMAIL || "CoderHaveli <onboarding@resend.dev>";

/**
 * Helper to determine a valid from address for Resend.
 * If a custom verified from email is defined in env, prioritize it over raw @gmail.com addresses.
 */
function resolveFrom(from) {
  if (process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }
  if (from && !from.includes("@gmail.com")) {
    return from;
  }
  return defaultFrom;
}

/**
 * Resend Transporter wrapper
 * Provides `.sendMail({ from, to, subject, html, text })` for seamless compatibility.
 */
const Mailer = {
  get resend() {
    return getResendClient();
  },
  async sendMail({ from, to, subject, html, text }) {
    const client = getResendClient();
    const recipient = Array.isArray(to) ? to : [to];

    const { data, error } = await client.emails.send({
      from: resolveFrom(from),
      to: recipient,
      subject,
      html,
      text,
    });

    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }

    return data;
  },
};

module.exports = Mailer;