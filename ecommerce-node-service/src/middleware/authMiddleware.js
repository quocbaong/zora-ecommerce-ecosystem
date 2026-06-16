module.exports = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-role'];

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  req.userId = userId;
  req.userRole = role;
  next();
};
