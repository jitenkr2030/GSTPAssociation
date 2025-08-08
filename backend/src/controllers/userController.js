const User = require('../models/User');

exports.getUserProfile = async (req, res) => {
    try {
            const user = await User.findById(req.user.id).select('-password');
                    res.status(200).json(user);
                        } catch (error) {
                                res.status(500).json({ error: error.message });
                                    }
                                    };

                                    exports.updateUserProfile = async (req, res) => {
                                        try {
                                                const updatedData = req.body;
                                                        const user = await User.findByIdAndUpdate(req.user.id, updatedData, {
                                                                    new: true,
                                                                            }).select('-password');
                                                                                    res.status(200).json(user);
                                                                                        } catch (error) {
                                                                                                res.status(500).json({ error: error.message });
                                                                                                    }
                                                                                                    };
                                                                                                    