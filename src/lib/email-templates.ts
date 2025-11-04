/**
 * Beautiful email templates for Lyceum
 * All templates use a consistent design system with Lyceum branding
 */

const LYCEUM_BRAND_COLOR = '#2563eb' // Blue-600
const LYCEUM_BRAND_COLOR_LIGHT = '#3b82f6' // Blue-500
const LYCEUM_BRAND_COLOR_DARK = '#1e40af' // Blue-700

interface EmailTemplateProps {
  title: string
  preheader?: string
  content: string
  actionUrl?: string
  actionText?: string
  footerText?: string
}

/**
 * Base email template with Lyceum branding
 */
function baseTemplate({
  title,
  preheader = '',
  content,
  actionUrl,
  actionText,
  footerText = 'Need help? Contact us at support@thelyceum.io'
}: EmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f3f4f6;
    }

    table {
      border-collapse: collapse;
      border-spacing: 0;
    }

    img {
      border: 0;
      display: block;
      max-width: 100%;
    }

    .preheader {
      display: none !important;
      visibility: hidden;
      mso-hide: all;
      font-size: 1px;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  ${preheader ? `<span class="preheader">${preheader}</span>` : ''}

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${LYCEUM_BRAND_COLOR} 0%, ${LYCEUM_BRAND_COLOR_DARK} 100%); padding: 48px 40px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <div style="width: 64px; height: 64px; background-color: white; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 4L4 12V20C4 28.84 10.68 36.88 20 40C29.32 36.88 36 28.84 36 20V12L20 4Z" fill="${LYCEUM_BRAND_COLOR}"/>
                        <path d="M20 14L12 18V24C12 28.42 15.58 32.56 20 34C24.42 32.56 28 28.42 28 24V18L20 14Z" fill="white"/>
                      </svg>
                    </div>
                    <!-- Title -->
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; line-height: 1.2;">
                      ${title}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 16px; line-height: 1.6; color: #374151;">
                    ${content}
                  </td>
                </tr>

                ${actionUrl && actionText ? `
                <!-- Action Button -->
                <tr>
                  <td align="center" style="padding-top: 32px; padding-bottom: 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius: 8px; background: linear-gradient(135deg, ${LYCEUM_BRAND_COLOR_LIGHT} 0%, ${LYCEUM_BRAND_COLOR} 100%); box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);">
                          <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                            ${actionText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Alternative Link -->
                <tr>
                  <td style="padding-top: 16px; padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 8px 0 0 0; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; color: #4b5563; word-break: break-all; font-family: 'Courier New', monospace;">
                      ${actionUrl}
                    </p>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                      ${footerText}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px;">
                    <a href="https://www.thelyceum.io" target="_blank" style="color: ${LYCEUM_BRAND_COLOR}; text-decoration: none; font-size: 14px; font-weight: 600;">
                      Visit Lyceum →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      © ${new Date().getFullYear()} Lyceum. All rights reserved.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">
                      <a href="https://www.thelyceum.io/privacy" target="_blank" style="color: #9ca3af; text-decoration: none;">Privacy Policy</a> •
                      <a href="https://www.thelyceum.io/terms" target="_blank" style="color: #9ca3af; text-decoration: none;">Terms of Service</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Email verification template
 */
export function emailVerificationTemplate(verificationUrl: string, userName: string = 'there'): string {
  return baseTemplate({
    title: 'Verify Your Email',
    preheader: 'Click to verify your email address and access your Lyceum account',
    content: `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hi ${userName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Thank you for creating your Lyceum account! We're excited to have you on board.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        To get started and access all features, please verify your email address by clicking the button below:
      </p>
      <div style="background-color: #eff6ff; border-left: 4px solid ${LYCEUM_BRAND_COLOR}; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 500;">
          🔒 This link will expire in 24 hours for security purposes.
        </p>
      </div>
    `,
    actionUrl: verificationUrl,
    actionText: 'Verify Email Address',
    footerText: 'If you didn\'t create a Lyceum account, you can safely ignore this email.'
  })
}

/**
 * Password reset template
 */
export function passwordResetTemplate(resetUrl: string, userName: string = 'there'): string {
  return baseTemplate({
    title: 'Reset Your Password',
    preheader: 'Reset your Lyceum account password',
    content: `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hi ${userName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        We received a request to reset the password for your Lyceum account.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Click the button below to create a new password:
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 500;">
          ⚠️ This password reset link will expire in 1 hour.
        </p>
      </div>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: 600;">
          Security Tips:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6b7280; line-height: 1.6;">
          <li>Choose a strong, unique password</li>
          <li>Use a password manager for better security</li>
          <li>Never share your password with anyone</li>
        </ul>
      </div>
    `,
    actionUrl: resetUrl,
    actionText: 'Reset Password',
    footerText: 'If you didn\'t request a password reset, please ignore this email or contact support if you have concerns.'
  })
}

/**
 * User invitation template
 */
export function userInviteTemplate(inviteUrl: string, invitedBy: string = 'Your administrator', companyName?: string): string {
  const companyText = companyName ? ` at ${companyName}` : ''

  return baseTemplate({
    title: 'You\'re Invited to Lyceum',
    preheader: `${invitedBy} invited you to join Lyceum${companyText}`,
    content: `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hi there,
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        <strong>${invitedBy}</strong> has invited you to join Lyceum${companyText}!
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Lyceum is a powerful platform for managing your team's workflows and collaboration.
      </p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 500;">
          ✨ Click the button below to accept your invitation and set up your account
        </p>
      </div>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: 600;">
          What's Next:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6b7280; line-height: 1.6;">
          <li>Click the invitation button below</li>
          <li>Set up your account and password</li>
          <li>Explore Lyceum's features</li>
          <li>Start collaborating with your team</li>
        </ul>
      </div>
    `,
    actionUrl: inviteUrl,
    actionText: 'Accept Invitation',
    footerText: 'This invitation was sent to you by a Lyceum administrator. If you believe this was sent in error, please contact the sender.'
  })
}

/**
 * Welcome email template (sent after successful verification)
 */
export function welcomeTemplate(dashboardUrl: string, userName: string = 'there'): string {
  return baseTemplate({
    title: 'Welcome to Lyceum!',
    preheader: 'Your account is ready. Let\'s get started!',
    content: `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        Hi ${userName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 18px; color: #111827; font-weight: 600;">
        🎉 Your email has been verified! Welcome to Lyceum.
      </p>
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
        You're all set to start using Lyceum. Here's what you can do now:
      </p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; margin: 24px 0; border-radius: 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 14px; color: #374151;">
                <span style="display: inline-block; width: 24px; height: 24px; background-color: ${LYCEUM_BRAND_COLOR}; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 8px; font-weight: 600; font-size: 12px;">1</span>
                <strong>Explore your dashboard</strong> – Get familiar with all features
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <p style="margin: 0; font-size: 14px; color: #374151;">
                <span style="display: inline-block; width: 24px; height: 24px; background-color: ${LYCEUM_BRAND_COLOR}; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 8px; font-weight: 600; font-size: 12px;">2</span>
                <strong>Complete your profile</strong> – Add more details about yourself
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <p style="margin: 0; font-size: 14px; color: #374151;">
                <span style="display: inline-block; width: 24px; height: 24px; background-color: ${LYCEUM_BRAND_COLOR}; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 8px; font-weight: 600; font-size: 12px;">3</span>
                <strong>Start collaborating</strong> – Invite team members and get started
              </p>
            </td>
          </tr>
        </table>
      </div>
      <div style="background-color: #eff6ff; border-left: 4px solid ${LYCEUM_BRAND_COLOR}; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #1e40af; font-weight: 500;">
          💡 Need help getting started? Check out our documentation or reach out to our support team.
        </p>
      </div>
    `,
    actionUrl: dashboardUrl,
    actionText: 'Go to Dashboard',
    footerText: 'Questions? We\'re here to help! Contact us at support@thelyceum.io'
  })
}
