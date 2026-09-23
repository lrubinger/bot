import { QueryInterface, DataTypes } from "sequelize";
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("InternalChatMessages", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      senderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Users", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      recipientId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Users", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      body: { type: DataTypes.TEXT, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
  },
  down: async (queryInterface: QueryInterface) => queryInterface.dropTable("InternalChatMessages")
};
