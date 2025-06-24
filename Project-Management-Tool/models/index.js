const sequelize = require('../config/db');
const User = require('./userModel');
const Project = require('./projectModel');
const ProjectMember = require('./projectMemberModel');
const Task = require('./taskModel'); // Import Task model
const Comment = require('./commentModel'); // Import Comment model
const TaskAssignment = require('./taskAssignmentModel'); // Import TaskAssignment model

// 🔵 Many-to-many: Shared access via ProjectMember
// Shared Projects - Many-to-Many
User.belongsToMany(Project, {
  through: ProjectMember,
  foreignKey: 'userId',
  otherKey: 'projectId',
  as: 'SharedProjects' // ✅ Add alias
});

Project.belongsToMany(User, {
  through: ProjectMember,
  foreignKey: 'projectId',
  otherKey: 'userId',
  as: 'Members' // ✅ Add alias
});

// 🔵 One-to-many: A Project belongs to one User (owner)
Project.belongsTo(User, { foreignKey: 'userId' });  // This was missing ❗
User.hasMany(Project, { foreignKey: 'userId' });

// 🔵 For eager loading project members (optional)
Project.ProjectMembers = Project.hasMany(ProjectMember, { foreignKey: 'projectId' });
User.ProjectMembers = User.hasMany(ProjectMember, { foreignKey: 'userId' });

// Define associations for Task and Comment models
Task.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(Task, { foreignKey: 'projectId', onDelete: 'CASCADE' });

Comment.belongsTo(Task, { foreignKey: 'taskId' });
Comment.belongsTo(User, { foreignKey: 'userId' });
Task.hasMany(Comment, { foreignKey: 'taskId', onDelete: 'CASCADE' });
User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Define associations for Task and User through TaskAssignment
Task.belongsToMany(User, {
  through: TaskAssignment,
  foreignKey: 'taskId',
  as: 'AssignedUsers',
  onDelete: 'CASCADE' // Add onDelete: 'CASCADE'
});
User.belongsToMany(Task, {
  through: TaskAssignment,
  foreignKey: 'userId',
  as: 'AssignedTasks',
  onDelete: 'CASCADE' // Add onDelete: 'CASCADE'
});

module.exports = {
  Project,
  User,
  ProjectMember,
  Task, // Export Task model
  Comment, // Export Comment model
  TaskAssignment // Export TaskAssignment model
};
