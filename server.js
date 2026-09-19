require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const planRoutes = require('./routes/planRoutes');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/plans', planRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'StudyLoop API running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`StudyLoop API listening on port ${PORT}`);
});