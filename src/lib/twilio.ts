import twilio from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID) {
  throw new Error('TWILIO_ACCOUNT_SID is not set in environment variables');
}

if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('TWILIO_AUTH_TOKEN is not set in environment variables');
}

if (!process.env.TWILIO_PHONE_NUMBER) {
  throw new Error('TWILIO_PHONE_NUMBER is not set in environment variables');
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendVerificationCode(phoneNumber: string, code: string) {
  try {
    const message = await client.messages.create({
      body: `Your SafariRide verification code is: ${code}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Twilio error:', error);
    throw new Error('Failed to send verification code');
  }
}

export function generateVerificationCode(): string {
  // Generate a 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isValidPhoneNumber(phoneNumber: string): boolean {
  // E.164 format validation
  // Must start with + and contain only digits after that
  // Total length should be between 8 and 15 digits (including country code)
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  return e164Regex.test(phoneNumber);
} 