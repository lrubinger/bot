import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("SystemSettings", {
      key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.bulkInsert("SystemSettings", [
      {
        key: "whatsappGroupsEnabled",
        value: "false",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("SystemSettings");
  }
};
