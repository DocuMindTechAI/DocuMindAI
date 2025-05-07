'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChatHistory extends Model {
    static associate(models) {
      ChatHistory.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  ChatHistory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,  // Pastikan ini ada
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      response: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [['web', 'whatsapp']],
        },
      },
    },
    {
      sequelize,
      modelName: 'ChatHistory',
    }
  );

  return ChatHistory;
};