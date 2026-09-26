import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Users", "addressStreet", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Users", "addressNumber", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Users", "addressComplement", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Users", "addressCity", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Users", "addressState", {
      type: DataTypes.STRING(2),
      allowNull: true
    });
    await queryInterface.addColumn("Users", "addressZipCode", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "addressZipCode");
    await queryInterface.removeColumn("Users", "addressState");
    await queryInterface.removeColumn("Users", "addressCity");
    await queryInterface.removeColumn("Users", "addressComplement");
    await queryInterface.removeColumn("Users", "addressNumber");
    await queryInterface.removeColumn("Users", "addressStreet");
  }
};
