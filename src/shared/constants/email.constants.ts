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
} as const;
