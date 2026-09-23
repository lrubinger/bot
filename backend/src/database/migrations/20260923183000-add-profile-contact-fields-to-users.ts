import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Users", "phone", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Users", "address", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "address");
    await queryInterface.removeColumn("Users", "phone");
  }
};
