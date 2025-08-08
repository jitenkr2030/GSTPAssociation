import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Updated import
import Homepage from './components/Home/Homepage';
import ReturnFiling from './components/GST/ReturnFiling';
import AuditCompliance from './components/GST/AuditCompliance';
import Analytics from './components/Admin/Analytics';
import Register from './components/Auth/Register'; // Import the Register component
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

const App = () => {
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/return-filing" element={<ReturnFiling />} />
          <Route path="/audit-compliance" element={<AuditCompliance />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/signup" element={<Register />} /> {/* Route for SignUp */}
          <Route path="/" element={<Homepage />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
};

export default App;


