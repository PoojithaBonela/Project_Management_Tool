const { Sequelize } = require('sequelize');

// Replace with your actual MySQL username and password
const sequelize = new Sequelize('task_manager', 'root', 'poojitha1905', {
  host: 'localhost',
  dialect: 'mysql',
});

module.exports = sequelize;
