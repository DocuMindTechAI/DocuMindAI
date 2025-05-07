<<<<<<< HEAD
'use strict';
const { Model } = require('sequelize');
=======
"use strict";
const { Model } = require("sequelize");
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Document, {
<<<<<<< HEAD
        foreignKey: 'userId',
        as: 'documents',
      });
      User.hasMany(models.ChatHistory, {
        foreignKey: 'userId',
        as: 'chatHistories',
=======
        foreignKey: "userId",
        as: "documents",
      });
      User.hasMany(models.ChatHistory, {
        foreignKey: "userId",
        as: "chatHistories",
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744
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
<<<<<<< HEAD
      modelName: 'User',
=======
      modelName: "User",
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744
    }
  );

  return User;
};
