import React from 'react';
import './Homepage.css';

const Homepage = () => {
  return (
    <div className="homepage-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Empowering GST Professionals</h1>
          <p>Join a community of experts and stay ahead with comprehensive GST solutions.</p>
          <div className="hero-buttons">
            <a href="/membership-tiers" className="btn-primary">Explore Membership Tiers</a>
            <a href="/contact" className="btn-secondary">Contact Us</a>
          </div>
        </div>
      </section>
      <section className="membership-tiers">
        <h2>Choose Your Membership</h2>
        <div className="tier-cards">
          <div className="tier-card">
            <h3>Basic Membership</h3>
            <p className="price">₹2,000/year</p>
            <ul>
              <li>Membership Management</li>
              <li>Community Forum</li>
              <li>Resource Library</li>
              <li>GST Glossary</li>
              <li>GST FAQs</li>
              <li>Job Board (Limited Access)</li>
              <li>GST News and Updates</li>
              <li>Automated Reminders</li>
              <li>GST Calculator (Basic)</li>
            </ul>
            <a href="/membership/basic" className="btn-primary">Learn More</a>
          </div>
          <div className="tier-card">
            <h3>Premium Membership</h3>
            <p className="price">₹5,000/year</p>
            <ul>
              <li>All Basic Membership Features</li>
              <li>GST Return Filing</li>
              <li>GST Audit and Compliance Tools</li>
              <li>Personalized Dashboard</li>
              <li>Advanced Resource Library</li>
              <li>Job Board (Unlimited Access)</li>
              <li>Peer Review and Feedback System</li>
              <li>Document Management System (DMS)</li>
              <li>Custom Report Generation</li>
              <li>Events and Training (Discounted Access)</li>
              <li>GST Notifications</li>
            </ul>
            <a href="/membership/premium" className="btn-primary">Explore Premium</a>
          </div>
          <div className="tier-card">
            <h3>Elite Membership</h3>
            <p className="price">₹10,000/year</p>
            <ul>
              <li>All Premium Membership Features</li>
              <li>GST Consultancy</li>
              <li>AI-Powered GST Advisory Bot</li>
              <li>Automated GST Return Review</li>
              <li>GST Health Check Tool</li>
              <li>Expert Network</li>
              <li>Advanced Analytics and Insights</li>
              <li>Webinars and Live Q&A Sessions</li>
              <li>Client Management Tools</li>
              <li>Collaboration Tools</li>
              <li>Referral Program</li>
              <li>Mobile App Integration</li>
              <li>Personalized Learning Paths</li>
              <li>GST Certification Program</li>
              <li>Third-Party Software Integration</li>
            </ul>
            <a href="/membership/elite" className="btn-primary">Discover Elite</a>
          </div>
        </div>
      </section>
      <section className="key-features">
        <h2>Features We Offer</h2>
        <div className="features-grid">
          <div className="feature-item">Personalized Dashboard</div>
          <div className="feature-item">GST News and Updates</div>
          <div className="feature-item">GST Calculator</div>
          <div className="feature-item">GST Return Filing</div>
          <div className="feature-item">GST Audit and Compliance</div>
          <div className="feature-item">GST Consultancy</div>
          <div className="feature-item">Community Forum</div>
          <div className="feature-item">Resource Library</div>
        </div>
      </section>
      <section className="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Join now or get in touch with us for more information.</p>
        <div className="cta-buttons">
          <a href="/signup" className="btn-primary">Sign Up Now</a>
          <a href="/contact" className="btn-secondary">Contact Us</a>
        </div>
      </section>
    </div>
  );
};

export default Homepage;

