import Link from 'next/link';
import { FiFacebook, FiTwitter, FiInstagram } from 'react-icons/fi'; // Example social icons , FiLinkedin, FiYoutube
// You can also use custom SVG icons or other icon libraries

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: 'About Us', href: '/about' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'List Your Car', href: '/list-your-car' },
    { label: 'Browse Cars', href: '/browse-cars' },
  ];

  const legalLinks = [
    { label: 'Terms & Conditions', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'FAQ', href: '/faq' }, // Link to the FAQ page we discussed
  ];

  const socialLinks = [
    { label: 'Facebook', href: 'https://facebook.com/safariride', icon: <FiFacebook /> },
    { label: 'Twitter', href: 'https://twitter.com/safariride', icon: <FiTwitter /> },
    { label: 'Instagram', href: 'https://instagram.com/safariride', icon: <FiInstagram /> },
    // { label: 'LinkedIn', href: 'https://linkedin.com/company/safariride', icon: <FiLinkedin /> },
    // { label: 'YouTube', href: 'https://youtube.com/safariride', icon: <FiYoutube /> },
  ];

  return (
    <footer className="bg-gray-800 text-gray-300 pt-12 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Brand & Description */}
          <div>
            <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
              SafariRide
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              Your adventure starts here. Discover and rent the perfect car for your journey across the wild.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-md font-semibold text-gray-100 uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white hover:underline transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal & Support */}
          <div>
            <h3 className="text-md font-semibold text-gray-100 uppercase tracking-wider mb-4">Legal & Support</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white hover:underline transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              {/* Example Contact Link */}
              <li>
                  <Link href="/contact-us" className="text-sm hover:text-white hover:underline transition-colors">
                    Contact Us
                  </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 4: Social Media & Newsletter (Optional) */}
          <div>
            <h3 className="text-md font-semibold text-gray-100 uppercase tracking-wider mb-4">Connect With Us</h3>
            {socialLinks.length > 0 && (
              <div className="flex space-x-4 mb-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="text-gray-400 hover:text-white transition-colors text-xl"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            )}
            {/* Optional Newsletter Signup
            <div>
                <p className="text-sm text-gray-400 mb-2">Stay updated with our latest deals:</p>
                <form className="flex">
                    <input type="email" placeholder="Your email" className="input-form-dark w-full rounded-l-md text-sm" />
                    <button type="submit" className="btn-primary-dark rounded-r-md text-sm px-3">Subscribe</button>
                </form>
            </div>
            */}
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="border-t border-gray-700 pt-8 text-center">
          <p className="text-sm text-gray-400">
            © {currentYear} SafariRide. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Adventure Awaits. Ride Responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;