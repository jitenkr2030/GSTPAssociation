const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    amount: {
            type: Number,
                    required: true,
                        },
                            paymentMethod: {
                                    type: String,
                                            enum: ['Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer'],
                                                    required: true,
                                                        },
                                                            status: {
                                                                    type: String,
                                                                            enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
                                                                                    default: 'Pending',
                                                                                        },
                                                                                            user: {
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

                                                                                                                                                                        const Payment = mongoose.model('Payment', paymentSchema);

                                                                                                                                                                        module.exports = Payment;
                                                                                                                                                                        