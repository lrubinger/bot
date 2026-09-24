import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Whatsapps", "wabaId", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Whatsapps", "phoneNumberId", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Whatsapps", "metaBusinessId", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "metaBusinessId");
    await queryInterface.removeColumn("Whatsapps", "phoneNumberId");
    await queryInterface.removeColumn("Whatsapps", "wabaId");
  }
};
