const Job = require('../models/Job');

const postJob = async (jobData) => {
    const newJob = new Job(jobData);
    await newJob.save();
    return newJob;
};

const getJobs = async () => {
    return await Job.find({});
};

const getJobById = async (jobId) => {
    return await Job.findById(jobId);
};

const updateJob = async (jobId, jobData) => {
    const updatedJob = await Job.findByIdAndUpdate(jobId, jobData, { new: true });
    return updatedJob;
};

const deleteJob = async (jobId) => {
    await Job.findByIdAndDelete(jobId);
    return { message: 'Job deleted successfully' };
};

module.exports = {
    postJob,
    getJobs,
    getJobById,
    updateJob,
    deleteJob,
};
