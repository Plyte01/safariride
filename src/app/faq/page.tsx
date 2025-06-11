// src/app/faq/page.tsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FAQ as PrismaFAQ } from '@prisma/client'; // Your Prisma FAQ type
import { FiChevronDown, FiChevronUp, FiHelpCircle, FiAlertTriangle } from 'react-icons/fi'; // Example icons

// Use PrismaFAQ type directly; no need for FAQItem alias

// Component for a single FAQ item (accordion)
const FAQAccordionItem = ({ faq }: { faq: PrismaFAQ }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <h2>
        <button
          type="button"
          className="flex justify-between items-center w-full py-5 px-1 text-left font-medium text-gray-700 hover:text-blue-600 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={`faq-answer-${faq.id}`}
        >
          <span className="flex-1">{faq.question}</span>
          {isOpen ? <FiChevronUp className="w-5 h-5 text-blue-500" /> : <FiChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
      </h2>
      {isOpen && (
        <div
          id={`faq-answer-${faq.id}`}
          className="py-5 px-1 text-sm text-gray-600 leading-relaxed prose max-w-none" // 'prose' for nice typography if using Tailwind Typography
          dangerouslySetInnerHTML={{ __html: faq.answer.replace(/\n/g, '<br />') }} // Basic rendering of newlines, consider a markdown parser for rich text
        >
          {/* Or if answer is plain text: <p>{faq.answer}</p> */}
        </div>
      )}
    </div>
  );
};


export default function FAQPage() {
  const [faqs, setFaqs] = useState<PrismaFAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFAQs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/faqs'); // Public API endpoint
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: "Failed to load FAQs." }));
          throw new Error(errData.message);
        }
        setFaqs(await response.json());
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred.");
        }
        console.error("FAQ fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const categoryKey = faq.category || 'General Questions'; // Default category
    if (!acc[categoryKey]) {
      acc[categoryKey] = [];
    }
    acc[categoryKey].push(faq);
    return acc;
  }, {} as Record<string, PrismaFAQ[]>);

  // Order categories (optional, e.g., put 'General Questions' first)
  const orderedCategories = Object.keys(groupedFaqs).sort((a, b) => {
    if (a === 'General Questions') return -1;
    if (b === 'General Questions') return 1;
    return a.localeCompare(b);
  });


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        {/* Basic Skeleton Loader for FAQs */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-10 flex items-center justify-center">
            <FiHelpCircle className="mr-3 text-blue-500 h-8 w-8"/> Frequently Asked Questions
        </h1>
        <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => ( // Skeleton for categories
                <div key={`cat-skel-${i}`} className="mb-8">
                    <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-6"></div>
                    {[...Array(3)].map((_, j) => ( // Skeleton for questions
                        <div key={`faq-skel-${j}`} className="h-12 bg-gray-200 rounded-md mb-2"></div>
                    ))}
                </div>
            ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="container mx-auto px-4 py-12 text-center">
            <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-300 rounded-lg">
                <FiAlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4"/>
                <h2 className="text-2xl font-semibold text-red-700 mb-2">Oops! Something went wrong.</h2>
                <p className="text-red-600">{error}</p>
                <p className="mt-4 text-sm">Please try refreshing the page or contact support if the problem persists.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-12 md:mb-16">
          <FiHelpCircle className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about booking, listing cars, payments, and more on SafariRide.
          </p>
        </div>

        {faqs.length === 0 ? (
          <div className="text-center py-10 bg-white p-8 rounded-lg shadow-md max-w-lg mx-auto">
            <p className="text-gray-600 text-lg">No FAQs available at the moment.</p>
            <p className="mt-2 text-sm text-gray-500">Please check back later or contact support if you have questions.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg">
            {orderedCategories.map((category) => (
              <div key={category} className="px-4 sm:px-6 py-6 last:pb-0"> {/* Add more padding for last section if needed */}
                {orderedCategories.length > 1 && ( // Only show category title if more than one category
                    <h2 className="text-2xl font-semibold text-gray-800 mb-5 border-b pb-3">
                    {category}
                    </h2>
                )}
                <div className="divide-y divide-gray-200">
                  {groupedFaqs[category]
                    .sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity)) // Sort by sortOrder within category
                    .map((faq) => (
                      <FAQAccordionItem key={faq.id} faq={faq} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
            <h3 className="text-xl font-semibold text-gray-700">Can&#39;t find what you&#39;re looking for?</h3>
            <p className="text-gray-600 mt-2">
                Our support team is ready to help. 
                <Link href="/contact-us" className="text-blue-600 hover:text-blue-700 font-medium hover:underline ml-1">Contact Us</Link>
            </p>
        </div>
      </div>
    </div>
  );
}