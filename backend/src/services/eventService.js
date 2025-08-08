const Event = require('../models/Event');

const createEvent = async (eventData) => {
    const newEvent = new Event(eventData);
    await newEvent.save();
    return newEvent;
};

const getEvents = async () => {
    return await Event.find({});
};

const getEventById = async (eventId) => {
    return await Event.findById(eventId);
};

const updateEvent = async (eventId, eventData) => {
    const updatedEvent = await Event.findByIdAndUpdate(eventId, eventData, { new: true });
    return updatedEvent;
};

const deleteEvent = async (eventId) => {
    await Event.findByIdAndDelete(eventId);
    return { message: 'Event deleted successfully' };
};

module.exports = {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
};
