require('dotenv').config();
const connectDB = require('./config/db');
const createApp = require('./app');

const boot = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }

  const app = createApp();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`StudyLoop API listening on port ${PORT}`);
  });
};

boot();