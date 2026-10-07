import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const temporaryPassword = process.env.RESET_LUCAS_PASSWORD;

    if (!temporaryPassword) {
      throw new Error("RESET_LUCAS_PASSWORD must be set for this migration");
    }

    const passwordHash = await hash(temporaryPassword, 8);

    await queryInterface.bulkUpdate(
      "Users",
      {
        passwordHash,
        mustChangePassword: true,
        online: false,
        updatedAt: new Date()
      },
      {
        email: "lucas.rubinger@gmail.com"
      }
    );
  },

  down: async () => {
    // One-time emergency password reset. No automatic rollback.
  }
};
