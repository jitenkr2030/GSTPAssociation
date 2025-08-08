require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./index');
const { APP_CONFIG } = require('./utils/constants');

// Connect to the database
mongoose.connect(APP_CONFIG.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Connected to the database');
})
.catch((error) => {
    console.error('Database connection error:', error);
    process.exit(1);
});

// Start the server
const port = APP_CONFIG.PORT;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
