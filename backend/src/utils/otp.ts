import { MailtrapClient } from "mailtrap";
import crypto from 'crypto';

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOtpEmail = async (email: string, otp: string) => {
  const client = new MailtrapClient({ token: process.env.MAILTRAP_API_TOKEN as string });

  const sender = {
    email: "hello@demomailtrap.co",
    name: "inPlace Authentication",
  };

  try {
    const response = await client.send({
      from: sender,
      to: [{ email }],
      category: "OTP Verification",
      subject: "Your OTP for inPlace",
      text: `Your inPlace OTP code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>inPlace Verification</h2>
          <p>Your OTP code is: <b style="font-size: 24px; color: #4F46E5;">${otp}</b></p>
          <p>It will expire in 10 minutes.</p>
        </div>
      `,
    });
    console.log(`Mailtrap SDK: OTP successfully sent to ${email} (Response: ${response.success})`);
  } catch (error: any) {
    console.warn(`Mailtrap SDK Error: Could not send email. OTP for ${email} is: ${otp}`, error.message);
  }
};
