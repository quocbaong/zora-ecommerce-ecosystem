const reminderService = require('../services/reminderService');

const handleErr = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message });
};

const createReminder = async (req, res) => {
  try {
    const { title, remindAt, participants } = req.body;
    if (!title || !remindAt) {
      return res.status(400).json({ success: false, error: 'title và remindAt là bắt buộc' });
    }
    const result = await reminderService.createReminder(
      req.params.groupId,
      req.userId,
      title,
      Number(remindAt),
      participants || []
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const listReminders = async (req, res) => {
  try {
    const reminders = await reminderService.listReminders(req.params.groupId, req.userId);
    res.json({ success: true, data: reminders });
  } catch (err) { handleErr(res, err); }
};

const markDone = async (req, res) => {
  try {
    await reminderService.markDone(req.params.groupId, req.params.reminderId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

const deleteReminder = async (req, res) => {
  try {
    await reminderService.deleteReminder(req.params.groupId, req.params.reminderId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

module.exports = { createReminder, listReminders, markDone, deleteReminder };
