const Consultancy = require('../models/Consultancy'); // Assuming Consultancy model

exports.bookConsultation = async (req, res) => {
    try {
            const newConsultation = new Consultancy({
                        user: req.user.id,
                                    consultant: req.body.consultant,
                                                date: req.body.date,
                                                            time: req.body.time,
                                                                        status: 'Scheduled',
                                                                                });

                                                                                        await newConsultation.save();
                                                                                                res.status(201).json(newConsultation);
                                                                                                    } catch (error) {
                                                                                                            res.status(500).json({ error: error.message });
                                                                                                                }
                                                                                                                };

                                                                                                                exports.getConsultations = async (req, res) => {
                                                                                                                    try {
                                                                                                                            const consultations = await Consultancy.find({ user: req.user.id }).populate('consultant', 'name');
                                                                                                                                    res.status(200).json(consultations);
                                                                                                                                        } catch (error) {
                                                                                                                                                res.status(500).json({ error: error.message });
                                                                                                                                                    }
                                                                                                                                                    };

                                                                                                                                                    exports.cancelConsultation = async (req, res) => {
                                                                                                                                                        try {
                                                                                                                                                                const consultation = await Consultancy.findById(req.params.id);

                                                                                                                                                                        if (!consultation || consultation.status !== 'Scheduled') {
                                                                                                                                                                                    return res.status(400).json({ error: 'Cannot cancel this consultation' });
                                                                                                                                                                                            }

                                                                                                                                                                                                    consultation.status = 'Cancelled';
                                                                                                                                                                                                            await consultation.save();

                                                                                                                                                                                                                    res.status(200).json(consultation);
                                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                                res.status(500).json({ error: error.message });
                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                    };
                                                                                                                                                                                                                                    