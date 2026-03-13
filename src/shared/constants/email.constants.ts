export const EMAIL_CONSTANTS = {
  SENDER_NAME: 'InZone',
  MAILJET_API_VERSION: 'v3.1',
  VERIFICATION_CODE_EXPIRATION_MINUTES: 10,
  EMAIL_SUBJECT: 'InZone - Email Verification Code',
  EMAIL_TEXT_TEMPLATE: (code: string) =>
    `Your verification code is: ${code}. It expires in ${EMAIL_CONSTANTS.VERIFICATION_CODE_EXPIRATION_MINUTES} minutes.`,
  EMAIL_HTML_TEMPLATE: (code: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #666;">This code will expire in <strong>${EMAIL_CONSTANTS.VERIFICATION_CODE_EXPIRATION_MINUTES} minutes</strong>.</p>
      <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
    </div>
  `,
  PASSWORD_RESET_SUBJECT: 'InZone - Password Reset Request',
  PASSWORD_RESET_HTML_TEMPLATE: (link: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset</h2>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      </div>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `,
} as const;
