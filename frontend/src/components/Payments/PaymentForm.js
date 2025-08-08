import React, { useState } from 'react';
import { makePayment } from '../../services/api';

const PaymentForm = () => {
  const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('credit_card');
      const [status, setStatus] = useState(null);

        const handlePayment = async () => {
            try {
                  const response = await makePayment({ amount, method });
                        setStatus(response.status);
                              alert('Payment successful.');
                                  } catch (error) {
                                        console.error(error);
                                              setStatus('Payment failed.');
                                                  }
                                                    };

                                                      return (
                                                          <div>
                                                                <h1>Make a Payment</h1>
                                                                      <input 
                                                                              type="number" 
                                                                                      placeholder="Amount" 
                                                                                              value={amount} 
                                                                                                      onChange={(e) => setAmount(e.target.value)} 
                                                                                                            />
                                                                                                                  <select value={method} onChange={(e) => setMethod(e.target.value)}>
                                                                                                                          <option value="credit_card">Credit Card</option>
                                                                                                                                  <option value="debit_card">Debit Card</option>
                                                                                                                                          <option value="net_banking">Net Banking</option>
                                                                                                                                                  <option value="upi">UPI</option>
                                                                                                                                                        </select>
                                                                                                                                                              <button onClick={handlePayment}>Pay Now</button>
                                                                                                                                                                    {status && <p>{status}</p>}
                                                                                                                                                                        </div>
                                                                                                                                                                          );
                                                                                                                                                                          };

                                                                                                                                                                          export default PaymentForm;
                                                                                                                                                                          