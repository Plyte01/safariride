// src/app/terms/page.tsx
export default function TermsPage() {
  const lastUpdated = "October 26, 2023"; // Replace with actual date

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 md:p-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-3">Terms and Conditions</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: {lastUpdated}</p>
      
      <div className="prose prose-slate lg:prose-lg max-w-none text-gray-700 space-y-6">
        <p>Welcome to SafariRide! These terms and conditions outline the rules and regulations for the use of SafariRide&#39;s Website, located at [YourWebsiteURL.com].</p>

        <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use SafariRide if you do not agree to take all of the terms and conditions stated on this page.</p>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">1. Definitions</h2>
        <p>The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and all Agreements: &quot;Client&quot;, &quot;You&quot; and &quot;Your&quot; refers to you, the person log on this website and compliant to the Company’s terms and conditions. &quot;The Company&quot;, &quot;Ourselves&quot;, &quot;We&quot;, &quot;Our&quot; and &quot;Us&quot;, refers to our Company. &quot;Party&quot;, &quot;Parties&quot;, or &quot;Us&quot;, refers to both the Client and ourselves. All terms refer to the offer, acceptance and consideration of payment necessary to undertake the process of our assistance to the Client in the most appropriate manner for the express purpose of meeting the Client’s needs in respect of provision of the Company’s stated services, in accordance with and subject to, prevailing law of [Your Jurisdiction, e.g., Kenya].</p>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">2. Use of the Platform</h2>
        <p>You must be at least 18 years of age to use our platform. By using SafariRide and by agreeing to these terms and conditions, you warrant and represent that you are at least 18 years of age.</p>
        <p>You are responsible for ensuring that all persons who access our platform through your internet connection are aware of these terms and conditions and other applicable policies, and that they comply with them.</p>
        
        <h2 className="text-xl font-semibold !mt-8 !mb-3">3. User Accounts</h2>
        <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
        <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.</p>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">4. Car Listings and Bookings</h2>
        <p>[Detailed terms regarding car owner responsibilities: accuracy of listings, vehicle maintenance, insurance requirements.]</p>
        <p>[Detailed terms regarding renter responsibilities: valid driver&#39;s license, adherence to rental agreement, proper use of vehicle, fuel policy, mileage limits if any.]</p>
        <p>[Detailed terms regarding booking process, payments, security deposits, cancellation policies, and fees.]</p>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">5. Intellectual Property</h2>
        <p>The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of SafariRide and its licensors. [...]</p>
        
        {/* Add many more sections as required by your legal counsel */}
        {/* e.g., Prohibited Uses, Termination, Limitation of Liability, Indemnification, Governing Law, Changes to Terms, Contact Information */}

        <h2 className="text-xl font-semibold !mt-8 !mb-3">Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us at [Your Contact Email or Link to Contact Page].</p>
      </div>
    </div>
  );
}