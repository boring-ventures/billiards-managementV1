import React from 'react';

export default function DocumentationPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Documentation</h1>
      <div className="prose">
        <p>Welcome to the Billiards Management documentation. Here you'll find guides and resources to help you use our platform effectively.</p>
        
        <h2 className="text-xl font-semibold mt-4 mb-2">Getting Started</h2>
        <p>Learn the basics of setting up and configuring your billiards venue management system.</p>
        
        <h2 className="text-xl font-semibold mt-4 mb-2">User Guides</h2>
        <ul className="list-disc pl-5 mt-2">
          <li>Table Management</li>
          <li>Inventory Control</li>
          <li>Point of Sale System</li>
          <li>Financial Tracking</li>
          <li>Settings and Configuration</li>
        </ul>
        
        <h2 className="text-xl font-semibold mt-4 mb-2">API Reference</h2>
        <p>Technical documentation for developers integrating with our platform.</p>
      </div>
    </div>
  );
} 