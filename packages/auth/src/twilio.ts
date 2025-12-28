import twilio from "twilio";

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export const sendOTP = async (phoneNumber: string, code: string) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[DEV] Sending OTP to", phoneNumber, "with code", code);
    return;
  }

  if (!twilioClient) {
    throw new Error("SMS service not configured");
  }

  try {
    await twilioClient.messages.create({
      body: `Your verification code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  } catch (error) {
    console.error("Failed to send SMS:", error);
    throw new Error("Failed to send verification code");
  }
};
