'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DocumentShare extends Model {
    static associate(models) {
      DocumentShare.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
      DocumentShare.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  DocumentShare.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      documentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Documents', key: 'id' },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Null jika pengguna belum terdaftar
        references: { model: 'Users', key: 'id' },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      accessLevel: {
        type: DataTypes.ENUM('view', 'edit'),
        allowNull: false,
        defaultValue: 'edit',
      },
    },
    {
      sequelize,
      modelName: 'DocumentShare',
      tableName: 'DocumentShares',
      timestamps: true,
    }
  );

  return DocumentShare;
};