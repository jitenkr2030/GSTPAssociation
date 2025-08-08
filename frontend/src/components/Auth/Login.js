import React, { useState } from 'react';
import { login } from '../../services/auth';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/actions/userActions';

const Login = () => {
  const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
      const dispatch = useDispatch();

        const handleLogin = async (e) => {
            e.preventDefault();
                try {
                      const userData = await login({ email, password });
                            dispatch(setUser(userData));
                                  // Redirect to dashboard
                                      } catch (error) {
                                            console.error(error);
                                                }
                                                  };

                                                    return (
                                                        <form onSubmit={handleLogin}>
                                                              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                                                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                                                          <button type="submit">Login</button>
                                                                              </form>
                                                                                );
                                                                                };

                                                                                export default Login;
                                                                                