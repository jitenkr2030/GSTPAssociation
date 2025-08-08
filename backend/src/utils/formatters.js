// Formats dates into a readable format
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Formats currency values based on locale and currency type
const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
};

// Trims strings and ensures consistent casing
const formatString = (str) => {
    return str.trim().toLowerCase();
};

module.exports = {
    formatDate,
    formatCurrency,
    formatString,
};
