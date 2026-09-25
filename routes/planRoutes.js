const express = require('express');
const Plan = require('../models/Plan');
const DaySchedule = require('../models/DaySchedule');
const { extractTopics, generateQuiz } = require('../services/geminiService');
const { buildSchedule, reshuffle } = require('../services/schedulerService');

const router = express.Router();

const clampNum = (n, min, max, dflt) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return dflt;
  return Math.max(min, Math.min(max, v));
};

const sanitizeTopics = (topics) =>
  (Array.isArray(topics) ? topics : [])
    .map((t) => {
      if (!t || typeof t !== 'object') return null;
      const name = typeof t.name === 'string' ? t.name.trim() : '';
      return {
        name,
        subject:
          typeof t.subject === 'string' && t.subject.trim()
            ? t.subject.trim()
            : 'General',
        estHours: clampNum(t.estHours, 1, 6, 2),
        difficulty: clampNum(t.difficulty, 1, 5, 3),
      };
    })
    .filter((t) => t && t.name);

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

router.post('/quiz', async (req, res) => {
  try {
    const { topicName, subject, difficulty } = req.body;
    if (!topicName || !topicName.trim()) {
      return res.status(400).json({ error: 'topicName is required' });
    }
    const questions = await generateQuiz(topicName.trim(), subject, difficulty);
    res.json({ questions });
  } catch (err) {
    console.error(err);
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

    const parsedExam = new Date(examDate);
    if (Number.isNaN(parsedExam.getTime())) {
      return res.status(400).json({ error: 'examDate must be a valid date' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedExam.getTime() <= today.getTime()) {
      return res.status(400).json({ error: 'Exam date must be in the future' });
    }

    const safeHours = clampNum(hoursPerDay, 1, 12, 2);
    const safeDaysPerWeek = clampNum(daysPerWeek, 1, 7, 7);
    const safeTopics = sanitizeTopics(topics);

    const plan = await Plan.create({
      syllabusRaw: syllabusText,
      topics: safeTopics,
      examDate,
      hoursPerDay: safeHours,
      daysPerWeek: safeDaysPerWeek,
    });

    const { schedule: rawSchedule, unplaced } = buildSchedule(
      plan.topics,
      new Date(),
      examDate,
      safeHours
    );

    const schedule = rawSchedule.map((day) => ({
      date: day.date,
      dayIndex: day.dayIndex,
      tasks: day.tasks.map((task) => {
        const topic = plan.topics.find((t) => t._id.toString() === String(task.topicId));
        return {
          topicId: topic ? topic._id : task.topicId,
          topicName: task.topicName,
          subject: task.subject || (topic && topic.subject) || 'General',
          estHours: task.estHours,
          status: task.status,
        };
      }),
    }));

    await DaySchedule.insertMany(
      schedule.map((day) => ({ planId: plan._id, ...day }))
    );

    const savedSchedule = await DaySchedule.find({ planId: plan._id }).sort({ dayIndex: 1 });

    res.status(201).json({ plan, schedule: savedSchedule, unplaced });
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

    let unplaced = 0;
    if (status === 'skipped') {
      const { days: updated, unplaced: unplacedHours } = reshuffle(
        days.map((d) => d.toObject()),
        dayIndex,
        plan.hoursPerDay,
        plan.examDate
      );
      unplaced = unplacedHours;
      for (const day of updated) {
        if (day._id) {
          await DaySchedule.findByIdAndUpdate(day._id, { tasks: day.tasks });
        } else {
          await DaySchedule.create({
            planId: id,
            date: day.date,
            dayIndex: day.dayIndex,
            tasks: day.tasks,
          });
        }
      }
    } else {
      target.tasks = target.tasks.map((t) => ({ ...t.toObject(), status: 'done' }));
      await target.save();
    }

    const savedSchedule = await DaySchedule.find({ planId: id }).sort({ dayIndex: 1 });
    res.json({ schedule: savedSchedule, unplaced });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle a single task between pending and done (per-task completion).
router.patch('/:id/day/:dayIndex/task/:taskId', async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const dayIndex = Number(req.params.dayIndex);
    const { status } = req.body;

    if (!['done', 'pending'].includes(status)) {
      return res.status(400).json({ error: "status must be 'done' or 'pending'" });
    }

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const day = await DaySchedule.findOne({ planId: id, dayIndex });
    if (!day) return res.status(404).json({ error: 'Day not found' });

    const task = day.tasks.find((t) => String(t._id) === String(taskId));
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.status = status;
    await day.save();

    const savedSchedule = await DaySchedule.find({ planId: id }).sort({ dayIndex: 1 });
    res.json({ schedule: savedSchedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;