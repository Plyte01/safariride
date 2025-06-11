import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Input validation (basic example)
function validateInput(data: { name: string; email: string; subject: string; message: string }) {
  if (!data.name || data.name.trim() === '') return 'Name is required.';
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'A valid email is required.';
  if (!data.subject || data.subject.trim() === '') return 'Subject is required.';
  if (!data.message || data.message.trim() === '') return 'Message is required.';
  if (data.message.length > 2000) return 'Message is too long (max 2000 characters).';
  return null; // No errors
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    const validationError = validateInput({ name, email, subject, message });
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    // Nodemailer transporter setup
    // Ensure these environment variables are set!
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
      secure: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
      // Optional: Add TLS options if required by your provider (e.g., for self-signed certs, not common for major providers)
      // tls: {
      //   ciphers:'SSLv3',
      //   rejectUnauthorized: false // Use only if you know what you're doing
      // }
    });

    // Verify transporter connection (optional, good for debugging setup)
    try {
        await transporter.verify();
        console.log("Nodemailer transporter is ready to send emails.");
    } catch (verifyError) {
        console.error("Nodemailer transporter verification failed:", verifyError);
        // Don't necessarily stop if verification fails, some servers don't support EHLO verify
        // But log it for sure. For production, you might want to fail hard here if verify is expected to work.
    }
    

    // Email content for you (the admin/support)
    const mailToAdminOptions = {
      from: process.env.EMAIL_FROM_ADDRESS, // Or use a specific "sender" like `"${name}" <${email}>` but this can be spoofed / DMARC issues
      to: process.env.EMAIL_TO_ADDRESS,    // Your support email
      replyTo: email, // Set the Reply-To header to the user's email
      subject: `New Contact Form Submission: ${subject}`,
      text: `You have received a new message from your website contact form.\n\n` +
            `Name: ${name}\n` +
            `Email: ${email}\n` +
            `Subject: ${subject}\n\n` +
            `Message:\n${message}`,
      html: `<p>You have received a new message from your website contact form.</p>
             <h3>Contact Details:</h3>
             <ul>
               <li><strong>Name:</strong> ${name}</li>
               <li><strong>Email:</strong> ${email}</li>
               <li><strong>Subject:</strong> ${subject}</li>
             </ul>
             <h3>Message:</h3>
             <p style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>`,
    };

    // Send the email to admin/support
    await transporter.sendMail(mailToAdminOptions);
    console.log("Contact form email sent to admin:", mailToAdminOptions.to);


    // Optional: Send a confirmation email to the user
    if (process.env.SEND_CONTACT_CONFIRMATION_EMAIL === 'true') { // Control via env var
        const mailToUserOptions = {
            from: process.env.EMAIL_FROM_ADDRESS,
            to: email,
            subject: `We've Received Your Message - SafariRide`,
            text: `Hi ${name},\n\nThank you for contacting SafariRide! We have received your message regarding "${subject}" and will get back to you as soon as possible.\n\nYour message:\n${message}\n\nBest regards,\nThe SafariRide Team`,
            html: `<p>Hi ${name},</p>
                   <p>Thank you for contacting SafariRide! We have received your message regarding "<strong>${subject}</strong>" and will get back to you as soon as possible.</p>
                   <p><strong>Your message:</strong></p>
                   <blockquote style="border-left: 2px solid #eee; padding-left: 1em; margin-left: 0.5em; color: #555;">${message.replace(/\n/g, '<br>')}</blockquote>
                   <p>Best regards,<br>The SafariRide Team</p>`,
        };
        try {
            await transporter.sendMail(mailToUserOptions);
            console.log("Confirmation email sent to user:", email);
        } catch (userMailError) {
            console.error("Failed to send confirmation email to user:", userMailError);
            // Don't fail the whole request if user confirmation fails, but log it.
        }
    }


    return NextResponse.json({ message: 'Message sent successfully!' }, { status: 200 });

  } catch (error) {
    console.error('Contact form submission error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    // Avoid exposing detailed internal errors to the client in production
    return NextResponse.json({ message: 'Failed to send message. Please try again later.', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}