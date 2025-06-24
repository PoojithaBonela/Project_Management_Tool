const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Task = require('./taskModel');
const User = require('./userModel');

const TaskAssignment = sequelize.define('TaskAssignment', {
  taskId: {
    type: DataTypes.STRING(36),
    references: {
      model: Task,
      key: 'id'
    },
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    primaryKey: true
  }
}, {
  tableName: 'TaskAssignments',
  timestamps: true
});

module.exports = TaskAssignment;
