import React, { useState } from 'react';
import { calculateGST } from '../../services/gst';

const GSTCalculator = () => {
  const [amount, setAmount] = useState(0);
    const [rate, setRate] = useState(18);
      const [gst, setGst] = useState(0);

        const handleCalculate = () => {
            const result = calculateGST(amount, rate);
                setGst(result);
                  };

                    return (
                        <div>
                              <h1>GST Calculator</h1>
                                    <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                                          <input type="number" placeholder="Rate (%)" value={rate} onChange={(e) => setRate(e.target.value)} />
                                                <button onClick={handleCalculate}>Calculate GST</button>
                                                      <p>GST: {gst}</p>
                                                          </div>
                                                            );
                                                            };

                                                            export default GSTCalculator;
                                                            