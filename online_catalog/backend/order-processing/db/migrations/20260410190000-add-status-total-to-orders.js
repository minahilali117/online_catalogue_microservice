'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Orders', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'pending'
    });

    await queryInterface.addColumn('Orders', 'totalAmount', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'status');
    await queryInterface.removeColumn('Orders', 'totalAmount');
  }
};
