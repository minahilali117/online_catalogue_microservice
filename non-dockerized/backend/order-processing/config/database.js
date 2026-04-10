const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'db', 'development.sqlite'),
    seederStorage: 'sequelize',
  },
  production: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'db', 'production.sqlite'),
    seederStorage: 'sequelize',
  },
};
