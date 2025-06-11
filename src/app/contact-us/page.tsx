"use client";

import { useState, FormEvent } from 'react';
import { FiSend } from 'react-icons/fi';
import { toast } from 'react-hot-toast'; // Assuming you're using react-hot-toast
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

export default function ContactUsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed successMessage, will use toast
  // const [formError, setFormError] = useState<string | null>(null); // Use toast for errors too

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // setFormError(null); // Clear previous errors

    const toastId = toast.loading("Sending your message...");

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message. Please try again.');
      }

      toast.success("Message sent successfully! We'll get back to you soon.", { id: toastId });
      // Clear form
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      console.error("Contact form error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.';
      toast.error(errorMessage, { id: toastId });
      // setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 md:p-10">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">Get In Touch</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Contact Information Section (as before) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Contact Information</h2>
            <p className="text-gray-600 mb-4">
              We&apos;d love to hear from you! Whether you have a question about features, trials, pricing, need a demo, or anything else, our team is ready to answer all your questions.
            </p>
          </div>
        </div>

        {/* Contact Form Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Send Us a Message</h2>
          {/* No need for formError display here if using toasts exclusively */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="label-form">Full Name <span className="text-red-500">*</span></label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="input-form w-full" placeholder="John Doe" disabled={isSubmitting} />
            </div>
            <div>
              <label htmlFor="email" className="label-form">Email Address <span className="text-red-500">*</span></label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-form w-full" placeholder="you@example.com" disabled={isSubmitting} />
            </div>
            <div>
              <label htmlFor="subject" className="label-form">Subject <span className="text-red-500">*</span></label>
              <input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className="input-form w-full" placeholder="e.g., Booking Inquiry" disabled={isSubmitting} />
            </div>
            <div>
              <label htmlFor="message" className="label-form">Your Message <span className="text-red-500">*</span></label>
              <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} className="input-form w-full" placeholder="How can we help you today?" disabled={isSubmitting}></textarea>
            </div>
            <div>
              <Button type="submit" className="w-full btn-primary-lg disabled:opacity-70" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><FiSend className="mr-2 h-4 w-4" /> Send Message</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}