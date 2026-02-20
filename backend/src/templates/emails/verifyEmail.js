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
                          Welcome, ${name}!
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: #64748b; line-height: 1.6; padding-bottom: 30px;">
                          Thanks for signing up for Answr. You're one step away from creating amazing quizzes. Please verify your email address to get started.
                        </td>
                      </tr>
                    </table>

                    <!-- Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <a href="${verificationUrl}" style="display: inline-block; background: #7c3aed; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 40px; border: 3px solid #000000; box-shadow: 3px 3px 0px #000000;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Link fallback -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 2px solid #e2e8f0;">
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748b; padding-top: 20px; line-height: 1.6;">
                          Or copy this link into your browser:<br>
                          <a href="${verificationUrl}" style="color: #7c3aed; word-break: break-all;">${verificationUrl}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #94a3b8; padding-top: 15px;">
                          This link expires in 24 hours.
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
                If you didn't create an account with Answr, you can safely ignore this email.
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
Welcome to Answr, ${name}!

Thanks for signing up. Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with Answr, you can safely ignore this email.
  `.trim();

  return { subject, html, text };
}
