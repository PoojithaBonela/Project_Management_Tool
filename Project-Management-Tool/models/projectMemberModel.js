const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectMember = sequelize.define('ProjectMember', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  projectId: {
    type: DataTypes.STRING(36), // match your project ID type
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
}, {
  tableName: 'project_members',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'projectId'],
    },
  ],
});

module.exports = ProjectMember;
