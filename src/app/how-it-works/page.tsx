// src/app/how-it-works/page.tsx
import Link from 'next/link';
import { FiSearch, FiCheckSquare, FiThumbsUp, FiKey, FiDollarSign, FiShield } from 'react-icons/fi'; // Example icons

export default function HowItWorksPage() {
  const forRenters = [
    {
      icon: <FiSearch className="h-8 w-8 text-blue-600 mb-3" />,
      title: "1. Find Your Ride",
      description: "Browse our extensive collection of vehicles. Use filters for location, car type, price, dates, and features to find the perfect match for your adventure or daily needs."
    },
    {
      icon: <FiCheckSquare className="h-8 w-8 text-green-600 mb-3" />,
      title: "2. Book Securely",
      description: "Once you've found your ideal car, select your rental dates and times. Review the transparent pricing and book your car securely through our platform. You'll receive an instant confirmation."
    },
    {
      icon: <FiKey className="h-8 w-8 text-orange-500 mb-3" />,
      title: "3. Pick Up & Go",
      description: "Coordinate with the car owner for a smooth pickup at the agreed location and time. Inspect the vehicle, complete any necessary paperwork, get the keys, and start your journey!"
    },
    {
      icon: <FiThumbsUp className="h-8 w-8 text-purple-600 mb-3" />,
      title: "4. Enjoy & Return",
      description: "Enjoy your trip with SafariRide! When your rental period is over, return the car to the agreed-upon location, ensuring it's in the same condition you received it. Leave a review to help other travelers."
    }
  ];

  const forOwners = [
    {
      icon: <FiPlusCircle className="h-8 w-8 text-blue-600 mb-3" />, // FiPlusCircle or another relevant icon
      title: "1. List Your Car",
      description: "Join our community of car owners. Create a detailed listing for your vehicle, including high-quality photos, features, pricing, and availability. It's free and easy!"
    },
    {
      icon: <FiMessageSquare className="h-8 w-8 text-green-600 mb-3" />, // FiMessageSquare or another relevant icon
      title: "2. Manage Bookings",
      description: "Receive booking requests from interested renters. Communicate with them through our platform, approve requests, and manage your car's calendar and availability with our intuitive dashboard."
    },
    {
      icon: <FiDollarSign className="h-8 w-8 text-orange-500 mb-3" />,
      title: "3. Earn Securely",
      description: "Get paid for every successful rental. SafariRide handles payment processing securely, and you receive your earnings directly. Turn your idle car into an income source."
    },
    {
      icon: <FiShield className="h-8 w-8 text-purple-600 mb-3" />,
      title: "4. Peace of Mind",
      description: "We provide tools and guidelines to help ensure a safe and smooth rental process. Benefit from our platform's reach and manage your car rentals efficiently."
    }
  ];


  return (
    <div className="bg-white shadow-lg rounded-lg p-6 md:p-10">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">How SafariRide Works</h1>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-sky-700 mb-6 text-center">For Renters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {forRenters.map((step, index) => (
            <div key={index} className="bg-slate-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
              <div className="flex justify-center mb-3">{step.icon}</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-green-700 mb-6 text-center">For Car Owners</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {forOwners.map((step, index) => (
            <div key={index} className="bg-slate-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
              <div className="flex justify-center mb-3">{step.icon}</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12 text-center">
        <p className="text-gray-700 mb-4">Ready to get started?</p>
        <div className="space-x-0 space-y-3 sm:space-y-0 sm:space-x-4">
            <Link href="/browse-cars" className="btn-primary inline-block px-8 py-3">
                Find a Car
            </Link>
            <Link href="/list-your-car" className="btn-secondary inline-block px-8 py-3">
                List Your Car
            </Link>
        </div>
      </div>
    </div>
  );
}

// Assume FiPlusCircle and FiMessageSquare are available or use other appropriate icons.
// Make sure to import them if you use them from react-icons.
import { FiPlusCircle, FiMessageSquare } from 'react-icons/fi';