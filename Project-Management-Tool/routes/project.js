const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { ensureAuthenticated } = require('../middleware/auth');

// ✅ Existing project routes
router.post('/', projectController.createProject);
router.get('/', projectController.getAllProjects);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// ✅ New route to get a single project by ID
router.get('/:id', projectController.getProjectById);

// ✅ New routes for adding members and searching users
router.post('/:projectId/members', projectController.addMemberToProject);
router.get('/:projectId/members', projectController.getProjectMembers); // Add this line
router.get('/users/search', projectController.searchUsers);

module.exports = router;
