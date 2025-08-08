import React from 'react';
import './Footer.css'; // Make sure to create this CSS file for styling

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-logo">
          <h1>GSTPAssociation.org</h1>
        </div>
        <nav className="footer-nav">
          <ul>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/contact">Contact Us</a></li>
            <li><a href="/about">About Us</a></li>
          </ul>
        </nav>
        <div className="footer-social">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon facebook">Facebook</a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon twitter">Twitter</a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon linkedin">LinkedIn</a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon instagram">Instagram</a>
        </div>
        <div className="footer-subscription">
          <p>Subscribe to our newsletter:</p>
          <form className="subscription-form">
            <input type="email" placeholder="Enter your email" aria-label="Enter your email" required />
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 GSTPAssociation.org. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;

