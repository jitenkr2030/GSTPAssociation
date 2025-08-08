const Payment = require('../models/Payment'); // Assuming Payment model

exports.initiatePayment = async (req, res) => {
    try {
            const { amount, paymentMethod } = req.body;

                    const payment = new Payment({
                                amount,
                                            paymentMethod,
                                                        status: 'Pending',
                                                                    user: req.user.id,
                                                                            });

                                                                                    await payment.save();

                                                                                            // Assume we have a function processPayment
                                                                                                    const paymentResult = await processPayment(payment);

                                                                                                            payment.status = paymentResult.status;
                                                                                                                    await payment.save();

                                                                                                                            res.status(201).json(payment);
                                                                                                                                } catch (error) {
                                                                                                                                        res.status(500).json({ error: error.message });
                                                                                                                                            }
                                                                                                                                            };

                                                                                                                                            exports.getPaymentStatus = async (req, res) => {
                                                                                                                                                try {
                                                                                                                                                        const payment = await Payment.findById(req.params.id);

                                                                                                                                                                if (!payment) {
                                                                                                                                                                            return res.status(404).json({ error: 'Payment not found' });
                                                                                                                                                                                    }

                                                                                                                                                                                            res.status(200).json(payment);
                                                                                                                                                                                                } catch (error) {
                                                                                                                                                                                                        res.status(500).json({ error: error.message });
                                                                                                                                                                                                            }
                                                                                                                                                                                                            };

                                                                                                                                                                                                            exports.refundPayment = async (req, res) => {
                                                                                                                                                                                                                try {
                                                                                                                                                                                                                        const payment = await Payment.findById(req.params.id);

                                                                                                                                                                                                                                if (!payment || payment.status !== 'Completed') {
                                                                                                                                                                                                                                            return res.status(400).json({ error: 'Invalid payment status for refund' });
                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                            // Assume we have a function processRefund
                                                                                                                                                                                                                                                                    const refundResult = await processRefund(payment);

                                                                                                                                                                                                                                                                            payment.status = 'Refunded';
                                                                                                                                                                                                                                                                                    await payment.save();

                                                                                                                                                                                                                                                                                            res.status(200).json(payment);
                                                                                                                                                                                                                                                                                                } catch (error) {
                                                                                                                                                                                                                                                                                                        res.status(500).json({ error: error.message });
                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                            };
                                                                                                                                                                                                                                                                                                            