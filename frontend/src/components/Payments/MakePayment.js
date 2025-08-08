import React, { useState } from 'react';
import { makePayment } from '../../services/api';

const MakePayment = () => {
  const [amount, setAmount] = useState(0);

    const handlePayment = async () => {
        try {
              await makePayment({ amount });
                    alert('Payment successful.');
                        } catch (error) {
                              console.error(error);
                                  }
                                    };

                                      return (
                                          <div>
                                                <h1>Make a Payment</h1>
                                                      <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                                                            <button onClick={handlePayment}>Pay Now</button>
                                                                </div>
                                                                  );
                                                                  };

                                                                  export default MakePayment;
                                                                  