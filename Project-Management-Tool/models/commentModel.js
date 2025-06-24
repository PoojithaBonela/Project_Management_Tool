const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Task = require('./taskModel');
const User = require('./userModel');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  taskId: {
    type: DataTypes.STRING(36), // Changed to STRING(36) to match Task ID type
    allowNull: false,
    references: {
      model: Task,
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
});

Comment.belongsTo(Task, { foreignKey: 'taskId' });
Comment.belongsTo(User, { foreignKey: 'userId' });
Task.hasMany(Comment, { foreignKey: 'taskId', onDelete: 'CASCADE' });
User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });

module.exports = Comment;