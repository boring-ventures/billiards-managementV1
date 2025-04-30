import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose">
        <p>At Billiards Management, we take your privacy seriously. This policy outlines how we collect, use, and protect your data.</p>
        
        {/* Add your actual privacy policy content here */}
        <h2 className="text-xl font-semibold mt-4 mb-2">1. Data Collection</h2>
        <p>We collect personal information necessary for providing our services.</p>
        
        <h2 className="text-xl font-semibold mt-4 mb-2">2. Data Usage</h2>
        <p>Your data is used solely for the purposes of providing and improving our services.</p>
        
        <h2 className="text-xl font-semibold mt-4 mb-2">3. Data Protection</h2>
        <p>We implement appropriate security measures to protect your personal information.</p>
      </div>
    </div>
  );
} 