const Job = require('../models/Job'); // Assuming Job model

exports.postJob = async (req, res) => {
    try {
            const newJob = new Job({
                        title: req.body.title,
                                    description: req.body.description,
                                                company: req.body.company,
                                                            location: req.body.location,
                                                                        user: req.user.id,
                                                                                });

                                                                                        const job = await newJob.save();
                                                                                                res.status(201).json(job);
                                                                                                    } catch (error) {
                                                                                                            res.status(500).json({ error: error.message });
                                                                                                                }
                                                                                                                };

                                                                                                                exports.getJobs = async (req, res) => {
                                                                                                                    try {
                                                                                                                            const jobs = await Job.find().populate('user', 'name');
                                                                                                                                    res.status(200).json(jobs);
                                                                                                                                        } catch (error) {
                                                                                                                                                res.status(500).json({ error: error.message });
                                                                                                                                                    }
                                                                                                                                                    };

                                                                                                                                                    exports.getJobById = async (req, res) => {
                                                                                                                                                        try {
                                                                                                                                                                const job = await Job.findById(req.params.id);

                                                                                                                                                                        if (!job) {
                                                                                                                                                                                    return res.status(404).json({ error: 'Job not found' });
                                                                                                                                                                                            }

                                                                                                                                                                                                    res.status(200).json(job);
                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                res.status(500).json({ error: error.message });
                                                                                                                                                                                                                    }
                                                                                                                                                                                                                    };
                                                                                                                                                                                                                    