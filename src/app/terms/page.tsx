import React from 'react';

export default function TermsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
      <div className="prose">
        <p>Welcome to Billiards Management. By using our service, you agree to the following terms and conditions.</p>
        
        {/* Add your actual terms content here */}
        <h2 className="text-xl font-semibold mt-4 mb-2">1. Service Usage</h2>
        <p>Our platform provides tools for managing billiards venues and related services.</p>
        
        <h2 className="text-xl font-semibold mt-4 mb-2">2. User Accounts</h2>
        <p>Account holders are responsible for maintaining the confidentiality of their login information.</p>
        
        <h2 className="text-xl font-semibold mt-4 mb-2">3. Data Privacy</h2>
        <p>We process and store data in accordance with our privacy policy.</p>
      </div>
    </div>
  );
} 