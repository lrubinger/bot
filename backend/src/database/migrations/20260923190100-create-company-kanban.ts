import { QueryInterface, DataTypes } from "sequelize";
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("CompanyKanbans", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      data: { type: DataTypes.JSONB, allowNull: false, defaultValue: { columns: [] } },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
  },
  down: async (queryInterface: QueryInterface) => queryInterface.dropTable("CompanyKanbans")
};
