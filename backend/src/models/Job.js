const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
            type: String,
                    required: true,
                            trim: true,
                                },
                                    description: {
                                            type: String,
                                                    required: true,
                                                        },
                                                            employer: {
                                                                    type: mongoose.Schema.Types.ObjectId,
                                                                            ref: 'User',
                                                                                    required: true,
                                                                                        },
                                                                                            location: {
                                                                                                    type: String,
                                                                                                            required: true,
                                                                                                                    trim: true,
                                                                                                                        },
                                                                                                                            salary: {
                                                                                                                                    type: Number,
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

                                                                                                                                                                                                const Job = mongoose.model('Job', jobSchema);

                                                                                                                                                                                                module.exports = Job;
                                                                                                                                                                                                