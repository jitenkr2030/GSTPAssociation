// services/userService.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get user profile
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
};

// Update user profile
const updateUserProfile = async (req, res) => {
  const { name, email } = req.body;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true });

  res.json(updatedUser);
};

// Delete user account
const deleteUserAccount = async (req, res) => {
  await User.findByIdAndDelete(req.user.id);
  res.status(200).json({ message: 'User account deleted successfully' });
};

// Change password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: 'Password changed successfully' });
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  changePassword,
};
