/**
 * Email verification template
 * @param {Object} options
 * @param {string} options.name - User's name
 * @param {string} options.verificationUrl - Full verification URL with token
 * @returns {Object} { subject, html, text }
 */
export function verifyEmailTemplate({ name, verificationUrl }) {
  const subject = 'Verify your Answr account';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #7c3aed; margin: 0;">Answr</h1>
  </div>

  <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Welcome, ${name}!</h2>
    <p>Thanks for signing up for Answr. Please verify your email address to complete your registration.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}"
         style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; font-weight: bold; border: 2px solid #000;">
        Verify Email Address
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      Or copy and paste this link into your browser:<br>
      <a href="${verificationUrl}" style="color: #7c3aed; word-break: break-all;">${verificationUrl}</a>
    </p>

    <p style="font-size: 14px; color: #666;">
      This link will expire in 24 hours.
    </p>
  </div>

  <p style="font-size: 12px; color: #999; text-align: center;">
    If you didn't create an account with Answr, you can safely ignore this email.
  </p>
</body>
</html>
  `.trim();

  const text = `
Welcome to Answr, ${name}!

Thanks for signing up. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with Answr, you can safely ignore this email.
  `.trim();

  return { subject, html, text };
}
