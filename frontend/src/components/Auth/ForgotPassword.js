import React, { useState } from 'react';
import { forgotPassword } from '../../services/auth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');

    const handleForgotPassword = async (e) => {
        e.preventDefault();
            try {
                  await forgotPassword({ email });
                        alert('Password reset link sent to your email.');
                            } catch (error) {
                                  console.error(error);
                                      }
                                        };

                                          return (
                                              <form onSubmit={handleForgotPassword}>
                                                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                                          <button type="submit">Send Reset Link</button>
                                                              </form>
                                                                );
                                                                };

                                                                export default ForgotPassword;
                                                                