const pollService = require('../services/pollService');

const handleErr = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ success: false, error: err.message });
};

const createPoll = async (req, res) => {
  try {
    const { question, options, isMultiple = false, autoCloseAt = null } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, error: 'question và ít nhất 2 options là bắt buộc' });
    }
    const result = await pollService.createPoll(
      req.params.groupId,
      req.userId,
      question,
      options,
      isMultiple,
      autoCloseAt
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const listPolls = async (req, res) => {
  try {
    const polls = await pollService.listPolls(req.params.groupId, req.userId);
    res.json({ success: true, data: polls });
  } catch (err) { handleErr(res, err); }
};

const getPoll = async (req, res) => {
  try {
    const poll = await pollService.getPoll(req.params.groupId, req.params.pollId, req.userId);
    res.json({ success: true, data: poll });
  } catch (err) { handleErr(res, err); }
};

const vote = async (req, res) => {
  try {
    const { optionIds } = req.body;
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ success: false, error: 'optionIds là bắt buộc' });
    }
    const result = await pollService.vote(req.params.groupId, req.params.pollId, optionIds, req.userId);
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const unvote = async (req, res) => {
  try {
    const result = await pollService.unvote(req.params.groupId, req.params.pollId, req.userId);
    res.json({ success: true, data: result });
  } catch (err) { handleErr(res, err); }
};

const closePoll = async (req, res) => {
  try {
    await pollService.closePoll(req.params.groupId, req.params.pollId, req.userId);
    res.json({ success: true });
  } catch (err) { handleErr(res, err); }
};

module.exports = { createPoll, listPolls, getPoll, vote, unvote, closePoll };
