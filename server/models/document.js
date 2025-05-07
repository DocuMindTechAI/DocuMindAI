'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    static associate(models) {
      // Siapa pembuat
      Document.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'creator',
      });
      // Siapa terakhir edit
      Document.belongsTo(models.User, {
        foreignKey: 'lastEditedById',
        as: 'lastEditor',
      });
      Document.hasMany(models.Summary, {
        foreignKey: 'documentId',
        as: 'summaries',
      });
    }
  }

  Document.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
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
      lastEditedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false, // Akan diisi oleh AI
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: 'Document',
      tableName: 'Documents',
      timestamps: true,
    }
  );

  return Document;
};