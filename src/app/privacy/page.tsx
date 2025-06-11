// src/app/privacy/page.tsx
export default function PrivacyPage() {
  const lastUpdated = "October 26, 2023"; // Replace with actual date

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 md:p-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-3">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: {lastUpdated}</p>

      <div className="prose prose-slate lg:prose-lg max-w-none text-gray-700 space-y-6">
        <p>SafariRide (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;) operates the [YourWebsiteURL.com] website (the &quot;Service&quot;).</p>
        <p>This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data. We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.</p>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">Information Collection and Use</h2>
        <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
        
        <h3 className="text-lg font-semibold !mt-6 !mb-2">Types of Data Collected</h3>
        <h4>Personal Data</h4>
        <p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you (&quot;Personal Data&quot;). Personally identifiable information may include, but is not limited to:</p>
        <ul>
          <li>Email address</li>
          <li>First name and last name</li>
          <li>Phone number</li>
          <li>Address, State, Province, ZIP/Postal code, City</li>
          <li>Driver&#39;s License information (for renters and owners)</li>
          <li>Vehicle information (for owners)</li>
          <li>Cookies and Usage Data</li>
        </ul>

        <h4>Usage Data</h4>
        <p>We may also collect information how the Service is accessed and used (&quot;Usage Data&quot;). This Usage Data may include information such as your computer&#39;s Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">Use of Data</h2>
        <p>SafariRide uses the collected data for various purposes:</p>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To notify you about changes to our Service</li>
          <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
          <li>To provide customer care and support</li>
          <li>To provide analysis or valuable information so that we can improve the Service</li>
          <li>To monitor the usage of the Service</li>
          <li>To detect, prevent and address technical issues</li>
        </ul>

        {/* TODO: Add more sections such as Transfer Of Data, Disclosure Of Data, Security Of Data, Service Providers, Links To Other Sites, Children's Privacy, Changes To This Privacy Policy, Contact Us */}

        <h2 className="text-xl font-semibold !mt-8 !mb-3">Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us: [Your Contact Email or Link to Contact Page].</p>
      </div>
    </div>
  );
}