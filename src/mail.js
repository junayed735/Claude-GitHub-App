// Email notifications for the contact form. Configured with SMTP_* environment variables.
const nodemailer = require("nodemailer");

const configured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transport;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

async function sendContactEmail(to, msg) {
  if (!configured() || !to) return false;
  await getTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    replyTo: `"${msg.name.replace(/"/g, "")}" <${msg.email}>`,
    subject: `New enquiry from ${msg.name}${msg.company ? ` (${msg.company})` : ""}`,
    text: `Name: ${msg.name}\nEmail: ${msg.email}\nCompany: ${msg.company || "-"}\n\n${msg.details}`,
  });
  return true;
}

module.exports = { sendContactEmail, mailConfigured: configured };
