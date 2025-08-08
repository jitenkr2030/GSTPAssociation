const Resource = require('../models/Resource');

const createResource = async (resourceData) => {
    const newResource = new Resource(resourceData);
    await newResource.save();
    return newResource;
};

const getResources = async () => {
    return await Resource.find({});
};

const getResourceById = async (resourceId) => {
    return await Resource.findById(resourceId);
};

const updateResource = async (resourceId, resourceData) => {
    const updatedResource = await Resource.findByIdAndUpdate(resourceId, resourceData, { new: true });
    return updatedResource;
};

const deleteResource = async (resourceId) => {
    await Resource.findByIdAndDelete(resourceId);
    return { message: 'Resource deleted successfully' };
};

module.exports = {
    createResource,
    getResources,
    getResourceById,
    updateResource,
    deleteResource,
};
