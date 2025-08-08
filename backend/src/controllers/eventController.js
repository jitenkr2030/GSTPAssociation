const Event = require('../models/Event'); // Assuming Event model

exports.createEvent = async (req, res) => {
    try {
            const newEvent = new Event({
                        title: req.body.title,
                                    description: req.body.description,
                                                date: req.body.date,
                                                            location: req.body.location,
                                                                        user: req.user.id,
                                                                                });

                                                                                        const event = await newEvent.save();
                                                                                                res.status(201).json(event);
                                                                                                    } catch (error) {
                                                                                                            res.status(500).json({ error: error.message });
                                                                                                                }
                                                                                                                };

                                                                                                                exports.getEvents = async (req, res) => {
                                                                                                                    try {
                                                                                                                            const events = await Event.find().populate('user', 'name');
                                                                                                                                    res.status(200).json(events);
                                                                                                                                        } catch (error) {
                                                                                                                                                res.status(500).json({ error: error.message });
                                                                                                                                                    }
                                                                                                                                                    };

                                                                                                                                                    exports.getEventById = async (req, res) => {
                                                                                                                                                        try {
                                                                                                                                                                const event = await Event.findById(req.params.id);

                                                                                                                                                                        if (!event) {
                                                                                                                                                                                    return res.status(404).json({ error: 'Event not found' });
                                                                                                                                                                                            }

                                                                                                                                                                                                    res.status(200).json(event);
                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                res.status(500).json({ error: error.message });
                                                                                                                                                                                                                    }
                                                                                                                                                                                                                    };
                                                                                                                                                                                                                    