const User = require('../models/User'); // Assuming User model
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');

exports.register = async (req, res) => {
    try {
            const { name, email, password } = req.body;
                    const hashedPassword = await bcrypt.hash(password, 10);
                            const user = new User({ name, email, password: hashedPassword });

                                    await user.save();
                                            const token = generateToken(user);
                                                    res.status(201).json({ token, user });
                                                        } catch (error) {
                                                                res.status(500).json({ error: error.message });
                                                                    }
                                                                    };

                                                                    exports.login = async (req, res) => {
                                                                        try {
                                                                                const { email, password } = req.body;
                                                                                        const user = await User.findOne({ email });

                                                                                                if (!user) {
                                                                                                            return res.status(404).json({ error: 'User not found' });
                                                                                                                    }

                                                                                                                            const isMatch = await bcrypt.compare(password, user.password);
                                                                                                                                    if (!isMatch) {
                                                                                                                                                return res.status(400).json({ error: 'Invalid credentials' });
                                                                                                                                                        }

                                                                                                                                                                const token = generateToken(user);
                                                                                                                                                                        res.status(200).json({ token, user });
                                                                                                                                                                            } catch (error) {
                                                                                                                                                                                    res.status(500).json({ error: error.message });
                                                                                                                                                                                        }
                                                                                                                                                                                        };
                                                                                                                                                                                        