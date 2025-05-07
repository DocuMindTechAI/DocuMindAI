'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Summary extends Model {
    static associate(models) {
      Summary.belongsTo(models.Document, {
        foreignKey: 'documentId',
        as: 'document',
      });
    }
  }

  Summary.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      documentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Documents',
          key: 'id',
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    },
    {
      sequelize,
      modelName: 'Summary',
    }
  );

  return Summary;
};