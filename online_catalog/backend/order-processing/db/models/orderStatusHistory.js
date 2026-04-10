'use strict';
module.exports = (sequelize, DataTypes) => {
  const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    previousStatus: {
      type: DataTypes.STRING,
      allowNull: true
    },
    newStatus: {
      type: DataTypes.STRING,
      allowNull: false
    },
    changedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {});
  OrderStatusHistory.associate = function(models) {
    // associations can be defined here
  };
  return OrderStatusHistory;
};
