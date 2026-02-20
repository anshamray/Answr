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
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%); min-height: 100vh;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #7c3aed; letter-spacing: -1px;">Answr</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border: 3px solid #000000; box-shadow: 4px 4px 0px #000000;">
                <tr>
                  <td style="padding: 40px 30px;">
                    <!-- Header -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: bold; color: #0f172a; padding-bottom: 20px;">
                          Password Reset
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #64748b; line-height: 1.6; padding-bottom: 10px;">
                          Hi ${name},
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #64748b; line-height: 1.6; padding-bottom: 30px;">
                          We received a request to reset your password. Click the button below to choose a new password:
                        </td>
                      </tr>
                    </table>

                    <!-- Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <a href="${resetUrl}" style="display: inline-block; background: #f59e0b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 40px; border: 3px solid #000000; box-shadow: 3px 3px 0px #000000;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Link fallback -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 2px solid #e2e8f0;">
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748b; padding-top: 20px; line-height: 1.6;">
                          Or copy this link into your browser:<br>
                          <a href="${resetUrl}" style="color: #7c3aed; word-break: break-all;">${resetUrl}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #94a3b8; padding-top: 15px;">
                          This link expires in 1 hour.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 30px;">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #94a3b8; margin: 0;">
                If you didn't request a password reset, you can safely ignore this email.<br>
                Your password will remain unchanged.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
