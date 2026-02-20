/**
 * Password reset email template
 * @param {Object} options
 * @param {string} options.name - User's name
 * @param {string} options.resetUrl - Full reset URL with token
 * @returns {Object} { subject, html, text }
 */
export function resetPasswordTemplate({ name, resetUrl }) {
  const subject = 'Reset your Answr password';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #7c3aed; margin: 0;">Answr</h1>
  </div>

  <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Password Reset Request</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; font-weight: bold; border: 2px solid #000;">
        Reset Password
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #7c3aed; word-break: break-all;">${resetUrl}</a>
    </p>

    <p style="font-size: 14px; color: #666;">
      This link will expire in 1 hour.
    </p>
  </div>

  <p style="font-size: 12px; color: #999; text-align: center;">
    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
  </p>
</body>
</html>
  `.trim();

  const text = `
Password Reset Request

Hi ${name},

We received a request to reset your password. Click the link below to choose a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
  `.trim();

  return { subject, html, text };
}
