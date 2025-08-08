const Loan = require('../models/Loan');

const applyForLoan = async (loanData) => {
    const newLoan = new Loan(loanData);
    await newLoan.save();
    return newLoan;
};

const getLoans = async () => {
    return await Loan.find({});
};

const getLoanById = async (loanId) => {
    return await Loan.findById(loanId);
};

const updateLoan = async (loanId, loanData) => {
    const updatedLoan = await Loan.findByIdAndUpdate(loanId, loanData, { new: true });
    return updatedLoan;
};

const deleteLoan = async (loanId) => {
    await Loan.findByIdAndDelete(loanId);
    return { message: 'Loan deleted successfully' };
};

const processLoanApproval = async (loanId) => {
    const loan = await Loan.findById(loanId);
    if (!loan) {
        throw new Error('Loan not found');
    }

    // Logic for approving the loan (e.g., checking credit score, collateral, etc.)
    loan.status = 'Approved';
    await loan.save();

    return { message: 'Loan approved successfully', loan };
};

const calculateLoanRepayment = async (loanId) => {
    const loan = await Loan.findById(loanId);
    if (!loan) {
        throw new Error('Loan not found');
    }

    // Logic to calculate repayment amount, interest, etc.
    const interestRate = loan.interestRate;
    const principal = loan.amount;
    const time = loan.term; // Assume time is in years for simplicity

    const repaymentAmount = principal * (1 + (interestRate * time));
    return { repaymentAmount, loan };
};

module.exports = {
    applyForLoan,
    getLoans,
    getLoanById,
    updateLoan,
    deleteLoan,
    processLoanApproval,
    calculateLoanRepayment,
};
