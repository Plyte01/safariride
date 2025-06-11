// src/lib/email.ts
import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Optional plain text version
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"), // Default to 587 if not set
  secure: parseInt(process.env.EMAIL_SERVER_PORT || "587") === 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  // Optional: for services like Gmail that may require less secure app access or specific TLS settings
  // tls: {
  //   ciphers:'SSLv3' // Example, might be needed for some older servers or specific configs
  //   // rejectUnauthorized: false // Use with caution, only for self-signed certs in dev
  // }
});

export const sendEmail = async ({ to, subject, html, text }: MailOptions) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM, // Sender address
    to: to, // List of receivers
    subject: subject, // Subject line
    text: text || html.replace(/<[^>]*>?/gm, ''), // Plain text body (strip HTML if no text provided)
    html: html, // HTML body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email.');
  }
};