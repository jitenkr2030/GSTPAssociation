const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
            type: String,
                    required: true,
                            trim: true,
                                },
                                    description: {
                                            type: String,
                                                    required: true,
                                                        },
                                                            date: {
                                                                    type: Date,
                                                                            required: true,
                                                                                },
                                                                                    location: {
                                                                                            type: String,
                                                                                                    required: true,
                                                                                                        },
                                                                                                            createdBy: {
                                                                                                                    type: mongoose.Schema.Types.ObjectId,
                                                                                                                            ref: 'User',
                                                                                                                                    required: true,
                                                                                                                                        },
                                                                                                                                            createdAt: {
                                                                                                                                                    type: Date,
                                                                                                                                                            default: Date.now,
                                                                                                                                                                },
                                                                                                                                                                    updatedAt: {
                                                                                                                                                                            type: Date,
                                                                                                                                                                                    default: Date.now,
                                                                                                                                                                                        },
                                                                                                                                                                                        });

                                                                                                                                                                                        const Event = mongoose.model('Event', eventSchema);

                                                                                                                                                                                        module.exports = Event;
                                                                                                                                                                                        