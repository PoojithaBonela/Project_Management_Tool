const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Project = require('./projectModel');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
  },
  attachments: {
    type: DataTypes.JSON, // Store attachment paths/URLs as a JSON array
    allowNull: true, // Attachments are optional
    defaultValue: [], // Default to an empty array
  },
  status: {
    type: DataTypes.ENUM('To Do', 'In Progress', 'Completed'),
    defaultValue: 'To Do',
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  projectId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    references: {
      model: Project,
      key: 'id'
    }
  }
});

Project.hasMany(Task, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Task.belongsTo(Project, { foreignKey: 'projectId' });

module.exports = Task;
