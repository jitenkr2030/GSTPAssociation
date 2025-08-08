const User = require('../models/User');
const Analytics = require('../models/Analytics'); // Assuming Analytics model

exports.getAllUsers = async (req, res) => {
    try {
            const users = await User.find().select('-password');
                    res.status(200).json(users);
                        } catch (error) {
                                res.status(500).json({ error: error.message });
                                    }
                                    };

                                    exports.deleteUser = async (req, res) => {
                                        try {
                                                const user = await User.findById(req.params.id);

                                                        if (!user) {
                                                                    return res.status(404).json({ error: 'User not found' });
                                                                            }

                                                                                    await user.remove();
                                                                                            res.status(200).json({ message: 'User removed' });
                                                                                                } catch (error) {
                                                                                                        res.status(500).json({ error: error.message });
                                                                                                            }
                                                                                                            };

                                                                                                            exports.getAnalyticsData = async (req, res) => {
                                                                                                                try {
                                                                                                                        const analytics = await Analytics.find();
                                                                                                                                res.status(200).json(analytics);
                                                                                                                                    } catch (error) {
                                                                                                                                            res.status(500).json({ error: error.message });
                                                                                                                                                }
                                                                                                                                                };
                                                                                                                                                