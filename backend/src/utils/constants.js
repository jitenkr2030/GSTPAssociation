// Application-wide constants

const USER_ROLES = {
    ADMIN: 'admin',
    USER: 'user',
    MODERATOR: 'moderator',
};

const RESPONSE_MESSAGES = {
    SUCCESS: 'Operation completed successfully',
    FAILURE: 'Operation failed',
    UNAUTHORIZED: 'You are not authorized to perform this action',
};

const APP_CONFIG = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
    DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/yourdbname',
};

module.exports = {
    USER_ROLES,
    RESPONSE_MESSAGES,
    APP_CONFIG,
};
