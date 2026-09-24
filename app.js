const express = require('express');
const cors = require('cors');
const planRoutes = require('./routes/planRoutes');

const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/plans', planRoutes);

  app.get('/', (req, res) => {
    res.json({ status: 'StudyLoop API running' });
  });

  return app;
};

module.exports = createApp;