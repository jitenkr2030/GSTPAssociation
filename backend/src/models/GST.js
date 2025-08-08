const mongoose = require('mongoose');

const gstSchema = new mongoose.Schema({
    gstNumber: {
            type: String,
                    required: true,
                            unique: true,
                                    trim: true,
                                        },
                                            user: {
                                                    type: mongoose.Schema.Types.ObjectId,
                                                            ref: 'User',
                                                                    required: true,
                                                                        },
                                                                            filings: [
                                                                                    {
                                                                                                date: { type: Date, required: true },
                                                                                                            amount: { type: Number, required: true },
                                                                                                                        status: { type: String, enum: ['Filed', 'Pending'], required: true },
                                                                                                                                },
                                                                                                                                    ],
                                                                                                                                        createdAt: {
                                                                                                                                                type: Date,
                                                                                                                                                        default: Date.now,
                                                                                                                                                            },
                                                                                                                                                            });

                                                                                                                                                            const GST = mongoose.model('GST', gstSchema);

                                                                                                                                                            module.exports = GST;
                                                                                                                                                            