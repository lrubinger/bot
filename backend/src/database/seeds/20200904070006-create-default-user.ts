import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async t => {
      const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

      if (!seedAdminPassword) {
        throw new Error("SEED_ADMIN_PASSWORD must be set before seeding");
      }

      const passwordHash = await hash(seedAdminPassword, 8);
      return Promise.all([
        queryInterface.bulkInsert(
          "Users",
          [
            {
              name: "Admin",
              email: process.env.SEED_ADMIN_EMAIL || "admin@example.com",
              profile: "admin",
              passwordHash,
              companyId: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              super: true
            }
          ],
          { transaction: t }
        )
      ]);
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Users", {});
  }
};
