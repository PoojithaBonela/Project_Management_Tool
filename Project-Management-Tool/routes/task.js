const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');

// Route for uploading attachments (multiple files)
router.post(
  '/:taskId/attachments',
  protect,
  taskController.upload.array('attachment'),
  taskController.uploadAttachment
);

// Delete an attachment from a task
router.delete(
  '/:taskId/attachments',
  protect,
  taskController.deleteAttachment
);

// Get a single task by ID (must come before /project/:id)
router.get('/:id', protect, taskController.getTaskById);

// Get all tasks for a specific project
router.get('/project/:projectId', protect, taskController.getTasksByProject);

// Get all tasks for the authenticated user
router.get('/', protect, taskController.getAllTasksForUser);

// Task CRUD routes
router.post('/', protect, taskController.createTask);
router.put('/:id', protect, taskController.updateTask);
router.delete('/:id', protect, taskController.deleteTask);

// Comments routes
router.post('/:taskId/comments', protect, commentController.createComment);
router.get('/:taskId/comments', protect, commentController.getCommentsByTask);
router.delete('/comments/:commentId/delete', protect, commentController.deleteComment); // New route for deleting comments

// Assign members to a task
router.put(
  '/:taskId/assign',
  protect,
  taskController.assignMembersToTask
);

module.exports = router;
