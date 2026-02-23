import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Send email using Resend HTTP API directly
 * Used by default for Resend (bypasses SMTP which is blocked on some cloud hosts)
 */
async function sendWithResendAPI({ to, from, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Resend API error');
    error.statusCode = response.status;
    error.response = data;
    throw error;
  }

  return { messageId: data.id };
}

/**
 * Initialize SMTP transporter for SendGrid or custom SMTP
 * Note: Resend uses HTTP API by default (see sendWithResendAPI)
 * Set RESEND_USE_SMTP=true to force SMTP for Resend (useful on VPS)
 */
function getTransporter() {
  if (transporter) return transporter;

  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  const timeoutOptions = {
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000
  };

  if (provider === 'sendgrid') {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: apiKey
      },
      ...timeoutOptions
    });
  } else if (provider === 'resend' && process.env.RESEND_USE_SMTP === 'true') {
    // SMTP mode for Resend (use on VPS where SMTP is not blocked)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: apiKey
      },
      ...timeoutOptions
    });
  } else if (process.env.SMTP_HOST) {
    // Custom SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined,
      ...timeoutOptions
    });
  } else {
    return null;
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
 * @returns {Promise<Object>} Send result with messageId
 */
export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'noreply@answr.ing';
  const provider = process.env.EMAIL_PROVIDER;

  // Skip sending if no email provider is configured
  const hasEmailConfig = process.env.SMTP_HOST || process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY;

  if (!hasEmailConfig) {
    console.log('[Email] Not configured, skipping. To:', to, 'Subject:', subject);
    return { messageId: 'email-not-configured' };
  }

  // Use Resend HTTP API by default (SMTP blocked on many cloud hosts)
  // Set RESEND_USE_SMTP=true to use SMTP instead (for VPS deployments)
  if (provider === 'resend' && process.env.RESEND_USE_SMTP !== 'true') {
    const result = await sendWithResendAPI({ to, from, subject, html, text });
    console.log('[Email] Sent via Resend API to:', to);
    return result;
  }

  // Use SMTP for SendGrid, custom SMTP, or Resend with RESEND_USE_SMTP=true
  const transport = getTransporter();
  if (!transport) {
    console.log('[Email] No transport configured');
    return { messageId: 'email-not-configured' };
  }

  const timeoutMs = 30000;
  const sendPromise = transport.sendMail({ from, to, subject, html, text });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Email send timeout')), timeoutMs)
  );

  const result = await Promise.race([sendPromise, timeoutPromise]);
  console.log('[Email] Sent via SMTP to:', to);
  return result;
}

/**
 * Verify email transport connection (SMTP only)
 * @returns {Promise<boolean>}
 */
export async function verifyEmailConnection() {
  try {
    const transport = getTransporter();
    if (!transport) return false;
    await transport.verify();
    return true;
  } catch (error) {
    console.error('[Email] Connection error:', error.message);
    return false;
  }
}
