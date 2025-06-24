const Task = require('../models/taskModel');
const Project = require('../models/projectModel');
const ProjectMember = require('../models/projectMemberModel');
const User = require('../models/userModel'); // ADD THIS LINE
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const TaskAssignment = require('../models/taskAssignmentModel');


// Set up multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'attachments');
    fs.mkdirSync(uploadDir, { recursive: true }); // Create directory if it doesn't exist
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

const createTask = async (req, res) => {
  const userId = req.user.id;
  const { title, description, status, projectId } = req.body;

  try {
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isOwner = project.userId === userId;

    const isMember = await ProjectMember.findOne({ where: { projectId, userId } });

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'You are not allowed to add tasks to this project' });
    }

    const task = await Task.create({ title, description, status, projectId });
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to create task', details: error.message });
  }
};

const getTasksByProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;

  try {
    // Check ownership
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isOwner = project.userId === userId;

    const isMember = await ProjectMember.findOne({
      where: { projectId, userId }
    });

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied to project tasks' });
    }

    const tasks = await Task.findAll({
      where: { projectId },
      attributes: ['id', 'title', 'description', 'status', 'deadline', 'attachments'],
      include: [{
        model: User,
        as: 'AssignedUsers',
        attributes: ['id', 'firstName', 'lastName', 'image']
      }]
    });
    
    // Attach assignedTo properly
    const tasksWithAssigned = tasks.map(task => {
      const json = task.toJSON();
      json.assignedTo = json.AssignedUsers || [];
      delete json.AssignedUsers;
      return json;
    });
    
    res.json(tasksWithAssigned);
    
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Define getTaskById as a const function
const getTaskById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const task = await Task.findByPk(id, {
      include: [{
        model: User,
        as: 'AssignedUsers',
        attributes: ['id', 'firstName', 'lastName', 'image'] // Changed 'profilePicture' to 'image'
      }]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findByPk(task.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found for this task' });
    }

    const isOwner = project.userId === userId;
    const isMember = await ProjectMember.findOne({
      where: { projectId: project.id, userId }
    });

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Access denied to this task' });
    }

    const taskJson = task.toJSON();
    taskJson.assignedTo = task.AssignedUsers.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      image: user.image
    }));
    

    res.json(taskJson);
  } catch (err) {
    console.error('Error fetching task by ID:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

const updateTask = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, description, status, deadline } = req.body; // Ensure deadline is destructured here

  try {
    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findByPk(task.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isOwner = project.userId === userId;
    const isMember = await ProjectMember.findOne({ where: { projectId: project.id, userId } });

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'You are not allowed to update this task' });
    }

    await task.update({ title, description, status, deadline }); // Ensure deadline is included in the update
    res.json({ message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

const deleteTask = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findByPk(task.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isOwner = project.userId === userId;
    const isMember = await ProjectMember.findOne({ where: { projectId: project.id, userId } });

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'You are not allowed to delete this task' });
    }

    await task.destroy();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// Define uploadAttachment as a const function
const uploadAttachment = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;

  try {
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findByPk(task.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isOwner = project.userId === userId;
    const isMember = await ProjectMember.findOne({ where: { projectId: project.id, userId } });

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'You are not allowed to add attachments to this task' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const newAttachmentPaths = req.files.map(file => `/uploads/attachments/${file.filename}`);
    
    const updatedAttachments = [...(task.attachments || []), ...newAttachmentPaths];

    await task.update({ attachments: updatedAttachments });
    res.status(200).json({ message: 'Attachments uploaded successfully', attachmentPaths: newAttachmentPaths });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ message: 'Failed to upload attachment', details: error.message });
  }
};

// New: Function to delete an attachment
const deleteAttachment = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;
  const { attachmentPath } = req.body;

  try {
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findByPk(task.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isOwner = project.userId === userId;
    const isMember = await ProjectMember.findOne({ where: { projectId: project.id, userId } });

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'You are not allowed to delete attachments from this task' });
    }

    let currentAttachments = task.attachments || [];
    const updatedAttachments = currentAttachments.filter(path => path !== attachmentPath);

    if (currentAttachments.length === updatedAttachments.length) {
      return res.status(404).json({ message: 'Attachment not found on this task' });
    }

    // Optionally, delete the file from the file system
    const filePath = path.join(__dirname, '..', attachmentPath); // Adjust path as necessary
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Failed to delete file from filesystem:', err);
        // Continue even if file system deletion fails, as DB will be updated
      }
    });

    await task.update({ attachments: updatedAttachments });
    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Failed to delete attachment', details: error.message });
  }
};

// Get all tasks for the authenticated user
const getAllTasksForUser = async (req, res) => { // Changed from exports.getAllTasksForUser
    try {
        const tasks = await Task.findAll({
            where: { userId: req.user.id },
            include: [
                { model: Project, attributes: ['id', 'name'] },
                { model: User, attributes: ['id', 'firstName', 'lastName'] }
            ],
            order: [['deadline', 'ASC']] // Sort by deadline in ascending order
        });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching all tasks for user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const assignMembersToTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;
  const { assignedMembers } = req.body; // Expect an array of user IDs

  console.log('taskId:', taskId);
  console.log('assignedMembers:', assignedMembers);

  try {
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findByPk(task.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isOwner = project.userId === userId;
    const isMember = await ProjectMember.findOne({ where: { projectId: project.id, userId } });

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'You are not allowed to assign members to this task' });
    }

    // Remove existing assignments for this task
    await TaskAssignment.destroy({ where: { taskId } });

    // Create new assignments
    if (assignedMembers && assignedMembers.length > 0) {
      const newAssignments = assignedMembers.map(memberId => ({
        taskId: taskId,
        userId: memberId
      }));
      console.log('Creating TaskAssignments:', newAssignments);
      try {
        await TaskAssignment.bulkCreate(newAssignments);
      } catch (err) {
        console.error('bulkCreate error:', err);
      }
    }

    res.status(200).json({ message: 'Members assigned to task successfully' });
  } catch (error) {
    console.error('Error assigning members to task:', error);
    res.status(500).json({ message: 'Failed to assign members to task', details: error.message });
  }
};

module.exports = {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
  uploadAttachment,
  deleteAttachment,
  upload, // Ensure 'upload' is included here
  getAllTasksForUser,
  assignMembersToTask // Add the new function to exports
};

