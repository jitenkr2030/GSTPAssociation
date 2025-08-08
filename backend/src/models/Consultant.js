const mongoose = require('mongoose');

const consultantSchema = new mongoose.Schema({
    name: {
            type: String,
                    required: true,
                            trim: true,
                                },
                                    specialty: {
                                            type: String,
                                                    required: true,
                                                        },
                                                            availableSlots: [
                                                                    {
                                                                                date: { type: Date, required: true },
                                                                                            isBooked: { type: Boolean, default: false },
                                                                                                    },
                                                                                                        ],
                                                                                                            rating: {
                                                                                                                    type: Number,
                                                                                                                            default: 0,
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

                                                                                                                                                                                                                const Consultant = mongoose.model('Consultant', consultantSchema);

                                                                                                                                                                                                                module.exports = Consultant;
                                                                                                                                                                                                                