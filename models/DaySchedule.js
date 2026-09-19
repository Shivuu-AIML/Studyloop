const mongoose = require('mongoose');

const dayScheduleSchema = new mongoose.Schema({
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  dayIndex: {
    type: Number,
    required: true,
  },
  tasks: [
    {
      topicId: { type: mongoose.Schema.Types.ObjectId },
      topicName: { type: String, required: true },
      estHours: { type: Number, required: true },
      status: {
        type: String,
        enum: ['pending', 'done', 'skipped'],
        default: 'pending',
      },
    },
  ],
});

module.exports =
  mongoose.models.DaySchedule || mongoose.model('DaySchedule', dayScheduleSchema);