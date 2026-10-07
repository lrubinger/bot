import { QueryInterface, DataTypes } from "sequelize";
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ContactJids", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      contactId: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE", onDelete: "CASCADE"
      },
      whatsappId: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE", onDelete: "CASCADE"
      },
      jid: { type: DataTypes.STRING, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("ContactJids", ["companyId","whatsappId","jid"], {
      unique: true, name: "contact_jids_company_whatsapp_jid_unique"
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ContactJids");
  }
};
