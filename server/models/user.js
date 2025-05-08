'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Document, {
        foreignKey: 'userId',
        as: 'documents',
      });
      User.hasMany(models.ChatHistory, {
        foreignKey: 'userId',
        as: 'chatHistories',
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true, // Password opsional karena menggunakan Google Login
      },
      googleId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
    }
  );

  return User;
};
