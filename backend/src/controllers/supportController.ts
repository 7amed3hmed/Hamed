import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import SupportMessage from '../models/SupportMessage';
import { sendSuccess, sendError } from '../utils/responseWrapper';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const SUPPORT_EMAIL_HTML = (name: string, email: string, subject: string, message: string, accountType: string) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>New Support Request — inPlace</title>
  </head>
  <body style="font-family:Arial,sans-serif;background:#f5f3ff;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">📩 New Support Request</h1>
      <p style="color:#e9d5ff;margin:6px 0 0;font-size:14px;">inPlace Platform — Contact Support</p>
    </div>
    <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;box-shadow:0 4px 14px rgba(0,0,0,0.07);">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:130px;">Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">${name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Email</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;"><a href="mailto:${email}" style="color:#7c3aed;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Account Type</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-transform:capitalize;">${accountType}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Subject</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;">${subject}</td>
        </tr>
      </table>
      <div style="margin-top:20px;">
        <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Message</p>
        <div style="background:#faf5ff;border-left:4px solid #7c3aed;padding:16px;border-radius:0 8px 8px 0;line-height:1.7;font-size:15px;">
          ${message.replace(/\n/g, '<br/>')}
        </div>
      </div>
      <p style="margin-top:24px;color:#9ca3af;font-size:12px;text-align:center;">
        This support request was submitted via inPlace Platform at ${new Date().toLocaleString()}.
      </p>
    </div>
  </body>
</html>
`;

const AUTO_REPLY_HTML = (name: string) => `
<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>We received your message — inPlace</title></head>
  <body style="font-family:Arial,sans-serif;background:#f5f3ff;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;">✅ Message Received!</h1>
      <p style="color:#e9d5ff;margin:6px 0 0;font-size:14px;">inPlace Support Team</p>
    </div>
    <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;box-shadow:0 4px 14px rgba(0,0,0,0.07);">
      <p>Hi <strong>${name}</strong>,</p>
      <p style="color:#6b7280;line-height:1.7;">
        Thank you for reaching out to us! We have received your support request and our team will review it shortly.
      </p>
      <p style="color:#6b7280;line-height:1.7;">
        We typically respond within <strong style="color:#7c3aed;">24–48 hours</strong>. If your issue is urgent, please mention that in your follow-up.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${frontendUrl}/internships" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;padding:12px 28px;border-radius:100px;text-decoration:none;font-weight:600;font-size:15px;">
          Explore Opportunities
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;">
        Best regards,<br/>
        <strong style="color:#7c3aed;">The inPlace Support Team</strong>
      </p>
    </div>
  </body>
</html>
`;

export const submitSupportMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message, accountType } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return sendError(res, 400, 'Name, email, subject, and message are required.');
    }
    if (name.trim().length < 2) return sendError(res, 400, 'Name must be at least 2 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 400, 'Invalid email address.');
    if (subject.trim().length < 3) return sendError(res, 400, 'Subject must be at least 3 characters.');
    if (message.trim().length < 10) return sendError(res, 400, 'Message must be at least 10 characters.');

    const validAccountTypes = ['volunteer', 'organization', 'admin', 'other'];
    const resolvedAccountType = validAccountTypes.includes(accountType) ? accountType : 'other';

    // Save to DB
    const supportMsg = await SupportMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      accountType: resolvedAccountType,
    });

    // Send notification to support inbox
    let emailSent = true;
    try {
      await transporter.sendMail({
        from: `"inPlace Support" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        replyTo: email.trim(),
        subject: `[inPlace Support] ${subject.trim()}`,
        html: SUPPORT_EMAIL_HTML(name.trim(), email.trim(), subject.trim(), message.trim(), resolvedAccountType),
      });

      // Send auto-reply to user
      await transporter.sendMail({
        from: `"inPlace Support" <${process.env.EMAIL_USER}>`,
        to: email.trim(),
        subject: `We received your message — inPlace Support`,
        html: AUTO_REPLY_HTML(name.trim()),
      });
    } catch (emailErr: any) {
      console.error('[Support] Email sending failed:', emailErr.message);
      emailSent = false;
      // Don't fail the request — message is saved in DB
    }

    return sendSuccess(
      res,
      201,
      { id: supportMsg._id, emailSent },
      emailSent
        ? 'Your message has been sent successfully! We will respond within 24–48 hours.'
        : 'Your message was saved. (Email notification delayed — our team will still review it.)'
    );
  } catch (error: any) {
    return sendError(res, 500, error.message || 'Failed to submit support message.');
  }
};
