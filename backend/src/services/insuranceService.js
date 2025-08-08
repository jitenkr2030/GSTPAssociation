const Insurance = require('../models/Insurance');

const createInsurancePolicy = async (policyData) => {
    const newPolicy = new Insurance(policyData);
    await newPolicy.save();
    return newPolicy;
};

const getInsurancePolicies = async () => {
    return await Insurance.find({});
};

const getInsurancePolicyById = async (policyId) => {
    return await Insurance.findById(policyId);
};

const updateInsurancePolicy = async (policyId, policyData) => {
    const updatedPolicy = await Insurance.findByIdAndUpdate(policyId, policyData, { new: true });
    return updatedPolicy;
};

const deleteInsurancePolicy = async (policyId) => {
    await Insurance.findByIdAndDelete(policyId);
    return { message: 'Insurance policy deleted successfully' };
};

const fileInsuranceClaim = async (claimData) => {
    // Logic for filing an insurance claim
    const policy = await Insurance.findById(claimData.policyId);
    if (!policy) {
        throw new Error('Policy not found');
    }

    policy.claims.push(claimData);
    await policy.save();

    return { message: 'Insurance claim filed successfully', policy };
};

const getInsuranceProviders = async () => {
    // Logic to fetch and return insurance providers
    // This could be an integration with third-party APIs or a local database
    const providers = [
        { id: 1, name: 'Provider A', details: 'Details about Provider A' },
        { id: 2, name: 'Provider B', details: 'Details about Provider B' },
    ];
    return providers;
};

module.exports = {
    createInsurancePolicy,
    getInsurancePolicies,
    getInsurancePolicyById,
    updateInsurancePolicy,
    deleteInsurancePolicy,
    fileInsuranceClaim,
    getInsuranceProviders,
};
