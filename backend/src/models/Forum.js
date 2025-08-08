const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
    title: {
            type: String,
                    required: true,
                            trim: true,
                                },
                                    description: {
                                            type: String,
                                                    required: true,
                                                        },
                                                            creator: {
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

                                                                                                                                        const Forum = mongoose.model('Forum', forumSchema);

                                                                                                                                        module.exports = Forum;
                                                                                                                                        