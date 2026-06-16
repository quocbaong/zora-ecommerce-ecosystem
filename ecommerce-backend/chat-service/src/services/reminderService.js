const reminderModel = require('../models/reminderModel');
const groupMessageModel = require('../models/groupMessageModel');
const groupMemberModel = require('../models/groupMemberModel');
const { requireMember } = require('./groupService');
const { getIO } = require('../config/socket');

const safeEmit = (fn) => {
  try { fn(); } catch (_) {}
};

const createReminder = async (groupId, createdBy, title, remindAt, participants = []) => {
  await requireMember(groupId, createdBy);

  const reminder = await reminderModel.createReminder(groupId, createdBy, title, remindAt, participants);

  // Send a REMINDER system message to the group
  const message = await groupMessageModel.createGroupMessage({
    groupId,
    senderId: createdBy,
    type: 'REMINDER',
    content: JSON.stringify({ reminderId: reminder.reminderId, title, remindAt, participants }),
  });

  safeEmit(() => {
    const io = getIO();
    io.to(`group:${groupId}`).emit('new_group_message', { groupId, message, reminder });
  });

  return { reminder, message };
};

const listReminders = async (groupId, requesterId) => {
  await requireMember(groupId, requesterId);
  return reminderModel.listReminders(groupId);
};

const markDone = async (groupId, reminderId, requesterId) => {
  const member = await requireMember(groupId, requesterId);
  const reminder = await reminderModel.getReminder(groupId, reminderId);
  if (!reminder) throw Object.assign(new Error('Nhắc hẹn không tồn tại'), { status: 404 });

  if (reminder.createdBy !== requesterId && member.role === 'MEMBER') {
    throw Object.assign(new Error('Không có quyền đánh dấu nhắc hẹn này'), { status: 403 });
  }

  await reminderModel.markReminderDone(groupId, reminderId);
};

const deleteReminder = async (groupId, reminderId, requesterId) => {
  const member = await requireMember(groupId, requesterId);
  const reminder = await reminderModel.getReminder(groupId, reminderId);
  if (!reminder) throw Object.assign(new Error('Nhắc hẹn không tồn tại'), { status: 404 });

  if (reminder.createdBy !== requesterId && member.role === 'MEMBER') {
    throw Object.assign(new Error('Không có quyền xóa nhắc hẹn này'), { status: 403 });
  }

  await reminderModel.deleteReminder(groupId, reminderId);
};

/**
 * Called every 60 seconds by setInterval in app.js.
 * Queries GSI1_RemindAt for today's date, fires due reminders.
 */
const checkDueReminders = async () => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const due = await reminderModel.listDueReminders(today);

    for (const reminder of due) {
      const { groupId, reminderId, title, participants, remindAt, createdBy } = reminder;

      // Post a fired REMINDER message bubble into the group chat
      const firedMessage = await groupMessageModel.createGroupMessage({
        groupId,
        senderId: createdBy,
        type: 'REMINDER',
        content: JSON.stringify({ reminderId, title, remindAt, participants, fired: true }),
      }).catch(() => null);

      // Emit to group room
      safeEmit(() => {
        const io = getIO();
        io.to(`group:${groupId}`).emit('reminder_triggered', { groupId, reminderId, title });
        if (firedMessage) {
          io.to(`group:${groupId}`).emit('new_group_message', { groupId, message: firedMessage });
        }

        // Notify each participant personally
        (participants || []).forEach((uid) => {
          io.to(`user:${uid}`).emit('new_notification', {
            groupId,
            type: 'REMINDER',
            preview: title,
            timestamp: new Date().toISOString(),
          });
        });
      });

      // Mark as done so it won't fire again
      await reminderModel.markReminderDone(groupId, reminderId).catch(() => {});
    }
  } catch (err) {
    console.error('[reminderService] checkDueReminders error:', err.message);
  }
};

module.exports = {
  createReminder,
  listReminders,
  markDone,
  deleteReminder,
  checkDueReminders,
};
