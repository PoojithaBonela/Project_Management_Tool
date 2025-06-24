const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_bin',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users', // this should match your user table name
      key: 'id',
    },
  }
}, {
  tableName: 'projects',
  timestamps: true,
});

// ✅ Import other models AFTER defining Project
const User = require('./userModel');
const ProjectMember = require('./projectMemberModel');

// ✅ Define many-to-many association
Project.belongsToMany(User, {
  through: ProjectMember,
  foreignKey: 'projectId',
  otherKey: 'userId'
});

User.belongsToMany(Project, {
  through: ProjectMember,
  foreignKey: 'userId',
  otherKey: 'projectId'
});

module.exports = Project;
