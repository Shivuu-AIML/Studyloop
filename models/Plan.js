const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  title: {
    type: String,
    default: 'My Study Plan',
  },
  examDate: {
    type: Date,
    required: true,
  },
  hoursPerDay: {
    type: Number,
    required: true,
  },
  daysPerWeek: {
    type: Number,
    required: true,
  },
  syllabusRaw: {
    type: String,
  },
  topics: [
    {
      name: { type: String, required: true },
      estHours: { type: Number, required: true },
      difficulty: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'done'],
        default: 'pending',
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Plan || mongoose.model('Plan', planSchema);