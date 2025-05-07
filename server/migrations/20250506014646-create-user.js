<<<<<<< HEAD
'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
=======
"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true, // Opsional karena menggunakan Google Login
      },
      googleId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      phoneNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
<<<<<<< HEAD
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
=======
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
<<<<<<< HEAD
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
=======
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744
      },
    });
  },

  async down(queryInterface, Sequelize) {
<<<<<<< HEAD
    await queryInterface.dropTable('Users');
=======
    await queryInterface.dropTable("Users");
>>>>>>> 70e84fc29e19955adac9ad2bb8c336f4e3f59744
  },
};
