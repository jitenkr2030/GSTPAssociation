const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: {
            type: String,
                    required: true,
                            trim: true,
                                },
                                    url: {
                                            type: String,
                                                    required: true,
                                                            trim: true,
                                                                },
                                                                    description: {
                                                                            type: String,
                                                                                },
                                                                                    addedBy: {
                                                                                            type: mongoose.Schema.Types.ObjectId,
                                                                                                    ref: 'User',
                                                                                                            required: true,
                                                                                                                },
                                                                                                                    createdAt: {
                                                                                                                            type: Date,
                                                                                                                                    default: Date.now,
                                                                                                                                        },
                                                                                                                                        });

                                                                                                                                        const Resource = mongoose.model('Resource', resourceSchema);

                                                                                                                                        module.exports = Resource;
                                                                                                                                        