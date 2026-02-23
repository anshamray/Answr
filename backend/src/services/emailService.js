import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize the email transporter based on environment configuration
 */
function getTransporter() {
  if (transporter) return transporter;

  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  console.log('[Email] Initializing transporter...');
  console.log('[Email] EMAIL_PROVIDER:', provider);
  console.log('[Email] EMAIL_FROM:', process.env.EMAIL_FROM);

  const timeoutOptions = {
    connectionTimeout: 10000, // 10 seconds to connect
    greetingTimeout: 10000,   // 10 seconds for greeting
    socketTimeout: 30000      // 30 seconds for socket
  };

  if (provider === 'sendgrid') {
    const apiKey = process.env.SENDGRID_API_KEY;
    console.log('[Email] SENDGRID_API_KEY exists:', !!apiKey);
    console.log('[Email] SENDGRID_API_KEY prefix:', apiKey ? apiKey.substring(0, 5) + '...' : 'N/A');
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid. Add it to .env');
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
    console.log('[Email] SendGrid transporter created');
  } else if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    console.log('[Email] RESEND_API_KEY exists:', !!apiKey);
    console.log('[Email] RESEND_API_KEY prefix:', apiKey ? apiKey.substring(0, 8) + '...' : 'N/A');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend. Add it to .env');
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: apiKey
      },
      ...timeoutOptions,
      debug: true, // Enable debug output
      logger: true  // Log to console
    });
    console.log('[Email] Resend transporter created (host: smtp.resend.com, port: 465)');
  } else if (process.env.SMTP_HOST) {
    // Custom SMTP - only if SMTP_HOST is explicitly set
    console.log('[Email] Using custom SMTP:', process.env.SMTP_HOST);
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
    console.log('[Email] Custom SMTP transporter created');
  } else {
    // No email provider configured - return null
    console.log('[Email] No email provider configured');
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

  // Skip sending if no email provider is configured
  const hasEmailConfig = process.env.SMTP_HOST || process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY;

  if (!hasEmailConfig) {
    console.log('--- Email (not configured, skipped) ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text?.substring(0, 200) + '...');
    console.log('Configure EMAIL_PROVIDER and credentials to enable email sending.');
    console.log('----------------------------------------');
    return { messageId: 'email-not-configured' };
  }

  try {
    console.log('--- Sending email ---');
    console.log('Provider:', process.env.EMAIL_PROVIDER);
    console.log('From:', from);
    console.log('To:', to);
    console.log('Subject:', subject);

    // Add timeout to prevent hanging forever
    const timeoutMs = 30000; // 30 seconds
    const sendPromise = transport.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout')), timeoutMs)
    );

    const result = await Promise.race([sendPromise, timeoutPromise]);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (err) {
    // Log full error for debugging
    console.error('[Email] ========== EMAIL ERROR ==========');
    console.error('[Email] Error name:', err.name);
    console.error('[Email] Error message:', err.message);
    console.error('[Email] Error code:', err.code);
    console.error('[Email] Response code:', err.responseCode);
    console.error('[Email] Response:', err.response);
    console.error('[Email] Command:', err.command);
    console.error('[Email] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error('[Email] ===================================');
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
