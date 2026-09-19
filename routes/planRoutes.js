const express = require('express');
const Plan = require('../models/Plan');
const DaySchedule = require('../models/DaySchedule');
const { extractTopics } = require('../services/geminiService');
const { buildSchedule, reshuffle } = require('../services/schedulerService');

const router = express.Router();

router.post('/extract', async (req, res) => {
  try {
    const { syllabusText } = req.body;
    if (!syllabusText || !syllabusText.trim()) {
      return res.status(400).json({ error: 'syllabusText is required' });
    }
    const topics = await extractTopics(syllabusText);
    res.json({ topics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { syllabusText, topics, examDate, hoursPerDay, daysPerWeek } = req.body;

    if (!examDate || !hoursPerDay || !daysPerWeek) {
      return res
        .status(400)
        .json({ error: 'examDate, hoursPerDay, and daysPerWeek are required' });
    }

    const plan = await Plan.create({
      syllabusRaw: syllabusText,
      topics: Array.isArray(topics) ? topics : [],
      examDate,
      hoursPerDay,
      daysPerWeek,
    });

    const rawSchedule = buildSchedule(plan.topics, new Date(), examDate, hoursPerDay);

    const schedule = rawSchedule.map((day) => ({
      date: day.date,
      dayIndex: day.dayIndex,
      tasks: day.tasks.map((task) => {
        const topic = plan.topics.find((t) => t._id.toString() === String(task.topicId));
        return {
          topicId: topic ? topic._id : task.topicId,
          topicName: task.topicName,
          estHours: task.estHours,
          status: task.status,
        };
      }),
    }));

    await DaySchedule.insertMany(
      schedule.map((day) => ({ planId: plan._id, ...day }))
    );

    const savedSchedule = await DaySchedule.find({ planId: plan._id }).sort({ dayIndex: 1 });

    res.status(201).json({ plan, schedule: savedSchedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/schedule', async (req, res) => {
  try {
    const days = await DaySchedule.find({ planId: req.params.id }).sort({ dayIndex: 1 });
    res.json(days);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/day/:dayIndex', async (req, res) => {
  try {
    const { id } = req.params;
    const dayIndex = Number(req.params.dayIndex);
    const { status } = req.body;

    if (!['done', 'skipped'].includes(status)) {
      return res.status(400).json({ error: "status must be 'done' or 'skipped'" });
    }

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    let days = await DaySchedule.find({ planId: id }).sort({ dayIndex: 1 });
    const target = days.find((d) => d.dayIndex === dayIndex);
    if (!target) return res.status(404).json({ error: 'Day not found' });

    if (status === 'skipped') {
      const updated = reshuffle(days.map((d) => d.toObject()), dayIndex, plan.hoursPerDay);
      for (const day of updated) {
        await DaySchedule.findByIdAndUpdate(day._id, { tasks: day.tasks });
      }
    } else {
      target.tasks = target.tasks.map((t) => ({ ...t.toObject(), status: 'done' }));
      await target.save();
    }

    const savedSchedule = await DaySchedule.find({ planId: id }).sort({ dayIndex: 1 });
    res.json({ schedule: savedSchedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;