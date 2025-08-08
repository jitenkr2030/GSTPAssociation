import React, { useState } from 'react';
import { submitAuditReport, getComplianceStatus } from '../../services/api';
import './AuditCompliance.css'; // Import a CSS file for styling

const AuditCompliance = () => {
  const [auditReport, setAuditReport] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpload = (e) => {
    setAuditReport(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior
    if (!auditReport) {
      alert('Please upload an audit report.');
      return;
    }

    setIsSubmitting(true);
    setComplianceStatus(''); // Reset compliance status before submitting

    try {
      await submitAuditReport(auditReport);
      const status = await getComplianceStatus();
      setComplianceStatus(status);
      alert('Audit report submitted successfully.');
    } catch (error) {
      console.error(error);
      alert('Error submitting audit report.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="audit-compliance-container">
      <h1>Audit and Compliance</h1>
      <form onSubmit={handleSubmit} className="audit-compliance-form">
        <div className="form-group">
          <label htmlFor="auditReport">Upload Audit Report:</label>
          <input
            id="auditReport"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleUpload}
            required
          />
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
        {complianceStatus && <p className={`status-message ${complianceStatus.startsWith('Error') ? 'error' : 'success'}`}>Compliance Status: {complianceStatus}</p>}
      </form>
    </div>
  );
};

export default AuditCompliance;
