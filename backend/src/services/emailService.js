import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize the email transporter based on environment configuration
 */
function getTransporter() {
  if (transporter) return transporter;

  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  if (provider === 'sendgrid') {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid. Add it to .env');
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else if (provider === 'resend') {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend. Add it to .env');
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
      }
    });
  } else {
    // Default SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
    });
  }

  return transporter;
}

/**
 * Send an email
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (fallback)
 * @returns {Promise<Object>} Nodemailer send result
 */
export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  const from = process.env.EMAIL_FROM || 'noreply@answr.ing';

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text
  };

  // In development, log instead of sending if no email config
  if (
    process.env.NODE_ENV !== 'production' &&
    !process.env.SMTP_HOST &&
    !process.env.SENDGRID_API_KEY &&
    !process.env.RESEND_API_KEY
  ) {
    console.log('--- Email (dev mode, not sent) ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('----------------------------------');
    return { messageId: 'dev-mode-no-send' };
  }

  try {
    return await transport.sendMail(mailOptions);
  } catch (err) {
    // Log full error for debugging (SMTP/Resend often put details in response or message)
    console.error('Email send failed:', err.message);
    if (err.response) console.error('SMTP/API response:', err.response);
    if (err.responseCode) console.error('Response code:', err.responseCode);
    throw err;
  }
}

/**
 * Verify email transport connection
 * @returns {Promise<boolean>}
 */
export async function verifyEmailConnection() {
  try {
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    console.error('Email connection error:', error.message);
    return false;
  }
}
