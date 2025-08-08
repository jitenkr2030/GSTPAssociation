const Resource = require('../models/Resource'); // Assuming Resource model

exports.addResource = async (req, res) => {
    try {
            const newResource = new Resource({
                        title: req.body.title,
                                    description: req.body.description,
                                                url: req.body.url,
                                                        });

                                                                const resource = await newResource.save();
                                                                        res.status(201).json(resource);
                                                                            } catch (error) {
                                                                                    res.status(500).json({ error: error.message });
                                                                                        }
                                                                                        };

                                                                                        exports.getResources = async (req, res) => {
                                                                                            try {
                                                                                                    const resources = await Resource.find();
                                                                                                            res.status(200).json(resources);
                                                                                                                } catch (error) {
                                                                                                                        res.status(500).json({ error: error.message });
                                                                                                                            }
                                                                                                                            };

                                                                                                                            exports.getResourceById = async (req, res) => {
                                                                                                                                try {
                                                                                                                                        const resource = await Resource.findById(req.params.id);

                                                                                                                                                if (!resource) {
                                                                                                                                                            return res.status(404).json({ error: 'Resource not found' });
                                                                                                                                                                    }

                                                                                                                                                                            res.status(200).json(resource);
                                                                                                                                                                                } catch (error) {
                                                                                                                                                                                        res.status(500).json({ error: error.message });
                                                                                                                                                                                            }
                                                                                                                                                                                            };
                                                                                                                                                                                            