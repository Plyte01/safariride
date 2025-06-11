// src/app/cookies/page.tsx
export default function CookiePolicyPage() {
  const lastUpdated = "October 26, 2023";

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 md:p-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-3">Cookie Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: {lastUpdated}</p>

      <div className="prose prose-slate lg:prose-lg max-w-none text-gray-700 space-y-6">
        <p>This Cookie Policy explains what cookies are and how SafariRide (&quot;we&quot;, &quot;us&quot;, and &quot;our&quot;) uses them on our website [YourWebsiteURL.com] (the &quot;Site&quot;). You should read this policy so you can understand what type of cookies we use, the information we collect using cookies and how that information is used.</p>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">What Are Cookies?</h2>
        <p>Cookies are small text files that are stored on your computer or mobile device when you visit a website. They allow the website to recognize your device and remember some information about your preferences or past actions.</p>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">How We Use Cookies</h2>
        <p>We use cookies for a variety of reasons detailed below. Unfortunately, in most cases, there are no industry standard options for disabling cookies without completely disabling the functionality and features they add to this site. It is recommended that you leave on all cookies if you are not sure whether you need them or not in case they are used to provide a service that you use.</p>
        <p>The types of cookies we may use include:</p>
        <ul>
            <li><strong>Essential Cookies:</strong> These are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you which amount to a request for services, such as setting your privacy preferences, logging in or filling in forms.</li>
            <li><strong>Performance and Analytics Cookies:</strong> These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.</li>
            <li><strong>Functionality Cookies:</strong> These cookies enable the website to provide enhanced functionality and personalisation. They may be set by us or by third party providers whose services we have added to our pages.</li>
            <li><strong>Targeting or Advertising Cookies:</strong> These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites.</li>
        </ul>

        <h2 className="text-xl font-semibold !mt-8 !mb-3">Your Choices Regarding Cookies</h2>
        <p>You have the option to accept or refuse cookies. Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. If you choose to decline cookies, you may not be able to fully experience the interactive features of our Site.</p>
        <p>[Provide information on how users can manage cookie preferences, e.g., through browser settings or a cookie consent banner/tool.]</p>

        {/* More details specific to your cookie usage */}

        <h2 className="text-xl font-semibold !mt-8 !mb-3">More Information</h2>
        <p>Hopefully, that has clarified things for you. If you are still looking for more information, then you can contact us through one of our preferred contact methods: [Your Contact Email or Link to Contact Page].</p>
      </div>
    </div>
  );
}