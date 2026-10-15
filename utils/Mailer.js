const { BrevoClient } = require("@getbrevo/brevo");
const nodemailer = require("nodemailer");

let brevoClient = null;
let nodemailerTransporter = null;
let hasLoggedFallbackWarning = false;

function getBrevoClient() {
  if (!brevoClient) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return null;
    brevoClient = new BrevoClient({ apiKey });
  }
  return brevoClient;
}

function getNodemailerTransporter() {
  if (!nodemailerTransporter) {
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASSWORD;
    if (!user || !pass) return null;

    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = port === 465;

    nodemailerTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }
  return nodemailerTransporter;
}

/**
 * Parses an address string like '"CoderHaveli Daily" <user@domain.com>' or 'user@domain.com'
 */
function parseAddress(addr, defaultName = "CoderHaveli") {
  const defaultEmail = process.env.BREVO_SENDER_EMAIL || process.env.MAIL_USER || "";
  if (!addr) {
    return { name: defaultName, email: defaultEmail };
  }
  const match = addr.match(/^"?([^"<]*)"?\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim() || defaultName,
      email: match[2].trim() || defaultEmail,
    };
  }
  if (addr.includes("@")) {
    return { name: defaultName, email: addr.trim() };
  }
  return { name: addr.trim(), email: defaultEmail };
}

function resolveSender(from) {
  const verifiedEmail = process.env.BREVO_SENDER_EMAIL || process.env.MAIL_USER;
  const parsed = parseAddress(from, "CoderHaveli");
  return {
    name: parsed.name,
    email: verifiedEmail || parsed.email,
  };
}

function resolveRecipients(to) {
  const list = Array.isArray(to) ? to : [to];
  const results = [];

  for (const item of list) {
    if (!item) continue;
    if (typeof item === "string") {
      const parts = item.split(",").map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        const parsed = parseAddress(part, "");
        if (parsed.name) {
          results.push({ email: parsed.email, name: parsed.name });
        } else {
          results.push({ email: parsed.email });
        }
      }
    } else if (typeof item === "object" && item.email) {
      results.push(item);
    }
  }

  return results;
}

/**
 * Brevo Mailer service
 * Uses Brevo's HTTPS REST API (Port 443) which never times out on cloud hosts.
 * Compatible with transporter.sendMail({ from, to, subject, html, text })
 */
const Mailer = {
  get brevo() {
    return getBrevoClient();
  },

  get transporter() {
    return getNodemailerTransporter();
  },

  async sendMail({ from, to, subject, html, text }) {
    const brevo = getBrevoClient();

    // 1. Primary: Send via Brevo HTTPS API (Port 443 — immune to cloud SMTP blocks)
    if (brevo) {
      const sender = resolveSender(from);
      const recipients = resolveRecipients(to);

      if (recipients.length === 0) {
        throw new Error("No recipients specified for email send");
      }

      const payload = {
        sender,
        to: recipients,
        subject: subject || "Notification from CoderHaveli",
        htmlContent: html || (text ? `<pre>${text}</pre>` : "<p></p>"),
      };

      if (text) {
        payload.textContent = text;
      }

      try {
        const res = await brevo.transactionalEmails.sendTransacEmail(payload);
        return res && res.data ? res.data : res;
      } catch (error) {
        const errMsg =
          (error.body && error.body.message) ||
          error.message ||
          JSON.stringify(error);
        throw new Error(`Brevo send failed: ${errMsg}`);
      }
    }

    // 2. Fallback: Nodemailer (SMTP — works locally, blocked on Render)
    const transporter = getNodemailerTransporter();
    if (transporter) {
      if (!hasLoggedFallbackWarning) {
        console.warn(
          "⚠️ BREVO_API_KEY is not defined. Falling back to Nodemailer (Gmail SMTP). Note: Outbound SMTP ports are blocked on Render/cloud hosting."
        );
        hasLoggedFallbackWarning = true;
      }

      const sender = resolveSender(from);
      const recipient = Array.isArray(to) ? to.join(", ") : to;
      return await transporter.sendMail({
        from: `"${sender.name}" <${sender.email}>`,
        to: recipient,
        subject,
        html,
        text,
      });
    }

    throw new Error(
      "No email provider configured. Please set BREVO_API_KEY in environment variables."
    );
  },

  async verify(callback) {
    const brevo = getBrevoClient();
    if (brevo) {
      try {
        await brevo.account.getAccount();
        if (typeof callback === "function") callback(null, true);
        return true;
      } catch (err) {
        if (typeof callback === "function") callback(err, false);
        throw err;
      }
    }

    const transporter = getNodemailerTransporter();
    if (transporter) {
      return transporter.verify(callback);
    }

    const err = new Error("BREVO_API_KEY is missing");
    if (typeof callback === "function") callback(err, false);
    throw err;
  },
};

module.exports = Mailer;