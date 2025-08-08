import React, { useEffect, useState } from 'react';
import { getPaymentHistory } from '../../services/api';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);

    useEffect(() => {
        const fetchPayments = async () => {
              const data = await getPaymentHistory();
                    setPayments(data);
                        };
                            fetchPayments();
                              }, []);

                                return (
                                    <div>
                                          <h1>Payment History</h1>
                                                <ul>
                                                        {payments.map((payment) => (
                                                                  <li key={payment.id}>
                                                                              {payment.date} - {payment.amount} - {payment.status}
                                                                                        </li>
                                                                                                ))}
                                                                                                      </ul>
                                                                                                          </div>
                                                                                                            );
                                                                                                            };

                                                                                                            export default PaymentHistory;
                                                                                                            