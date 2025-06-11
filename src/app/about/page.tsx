// src/app/about/page.tsx
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">About SafariRide</h1>
      <div className="prose lg:prose-xl max-w-none text-gray-700">
        <p>
          Welcome to SafariRide, your premier platform for discovering and renting the perfect vehicle for your adventures!
          Whether you&apos;re planning an epic safari across the plains, a city escape, or need a reliable car for your daily commute,
          SafariRide connects you with a diverse fleet of vehicles from trusted owners.
        </p>
        <h2 className="text-2xl font-semibold text-gray-700 mt-8 mb-3">Our Mission</h2>
        <p>
          Our mission is to make car rental simple, secure, and accessible for everyone. We aim to provide a seamless
          experience for both renters looking for quality vehicles and car owners wishing to share their cars and earn.
          We believe in fostering a community built on trust, reliability, and a shared passion for exploration.
        </p>
        <h2 className="text-2xl font-semibold text-gray-700 mt-8 mb-3">Why Choose SafariRide?</h2>
        <ul>
          <li><strong>Wide Selection:</strong> From rugged 4x4s for off-road adventures to comfortable sedans for city driving and spacious vans for group travel.</li>
          <li><strong>Trusted Owners:</strong> We work to verify owners and listings to ensure quality and safety.</li>
          <li><strong>Easy Booking:</strong> Our user-friendly platform makes finding and booking your ideal car a breeze.</li>
          <li><strong>Transparent Pricing:</strong> No hidden fees. See clear pricing upfront.</li>
          <li><strong>Secure Platform:</strong> We prioritize your security throughout the booking and payment process.</li>
        </ul>
        <h2 className="text-2xl font-semibold text-gray-700 mt-8 mb-3">Get in Touch</h2>
        <p>
          Have questions or need assistance? Visit our <Link href="/faq" className="text-blue-600 hover:underline">FAQ page</Link> or <Link href="/contact-us" className="text-blue-600 hover:underline">contact our support team</Link>.
          We&apos;re here to help you embark on your next journey!
        </p>
      </div>
    </div>
  );
}