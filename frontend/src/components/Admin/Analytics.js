import React, { useEffect, useState } from 'react';
import { getAnalyticsData } from '../../services/api';
import './Analytics.css'; // Ensure to create this CSS file for styling

const Analytics = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAnalyticsData();
        setData(result);
      } catch (error) {
        setError('Error fetching analytics data');
        console.error(error);
      }
    };
    fetchData();
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  return (
    <div className="analytics-container">
      <h1 className="title">Analytics Dashboard</h1>
      <div className="analytics-cards">
        <div className="card">
          <h2>Total Returns Filed</h2>
          <p>{data.totalReturnsFiled}</p>
        </div>
        <div className="card">
          <h2>Total Payments Made</h2>
          <p>{data.totalPaymentsMade}</p>
        </div>
        <div className="card">
          <h2>Compliance Status</h2>
          <p>{data.complianceStatus}</p>
        </div>
        {/* Add more analytics data as needed */}
      </div>
    </div>
  );
};

export default Analytics;
