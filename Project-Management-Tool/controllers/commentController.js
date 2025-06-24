const Comment = require('../models/commentModel');
const User = require('../models/userModel');
const Task = require('../models/taskModel');

// Create a new comment
exports.createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // Assuming user ID is available from authentication middleware

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Comment content cannot be empty.' });
    }

    const newComment = await Comment.create({
      content,
      taskId,
      userId,
    });

    // Fetch the created comment with user details
    const commentWithUser = await Comment.findByPk(newComment.id, {
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'displayName'],
      }],
    });

    res.status(201).json(commentWithUser);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get comments for a specific task
exports.getCommentsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await Comment.findAll({
      where: { taskId },
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'displayName'],
      }],
      order: [['createdAt', 'ASC']],
    });
    res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id; // Assuming user ID is available from authentication middleware

    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Ensure only the owner can delete their comment
    if (comment.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this comment' });
    }

    // Mark the comment as deleted instead of destroying it
    comment.deleted = true;
    comment.content = 'This comment was deleted.'; // Optional: clear content
    await comment.save();

    res.status(200).json({ message: 'Comment marked as deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};