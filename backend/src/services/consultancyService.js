const Consultant = require('../models/Consultant');

const bookConsultation = async (consultationData) => {
    // Logic to book a consultation
    // This would typically include checking the availability of the consultant, scheduling, etc.
    const newConsultation = new Consultant(consultationData);
    await newConsultation.save();
    return newConsultation;
};

const getConsultants = async () => {
    return await Consultant.find({});
};

const getAvailableSlots = async (consultantId) => {
    // Logic to get available slots for a consultant
    const consultant = await Consultant.findById(consultantId);
    return consultant.availableSlots; // Assuming availableSlots is a field in the Consultant model
};

module.exports = {
    bookConsultation,
    getConsultants,
    getAvailableSlots,
};
