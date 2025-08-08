import React, { useState } from 'react';
import { submitReturnFiling } from '../../services/api';
import './ReturnFiling.css'; // Import a CSS file for styling

const ReturnFiling = () => {
  const [gstin, setGstin] = useState('');
  const [period, setPeriod] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior
    setIsSubmitting(true);
    setStatus(null); // Reset status before submitting

    // Basic validation
    if (!gstin || !period || !amount) {
      setStatus('Please fill in all fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await submitReturnFiling({ gstin, period, amount });
      if (response.status === 'success') {
        setStatus('Return filed successfully.');
      } else {
        setStatus('Error in filing return.');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error in filing return.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="return-filing-container">
      <h1>GST Return Filing</h1>
      <form onSubmit={handleSubmit} className="return-filing-form">
        <div className="form-group">
          <label htmlFor="gstin">GSTIN:</label>
          <input
            id="gstin"
            type="text"
            placeholder="Enter GSTIN"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="period">Period (YYYY-MM):</label>
          <input
            id="period"
            type="text"
            placeholder="Enter Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">Amount:</label>
          <input
            id="amount"
            type="number"
            placeholder="Enter Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Return'}
        </button>
        {status && <p className={`status-message ${status.startsWith('Error') ? 'error' : 'success'}`}>{status}</p>}
      </form>
    </div>
  );
};

export default ReturnFiling;
