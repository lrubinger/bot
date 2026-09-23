import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

interface Data {
  ownerId: number;
  companyId: number;
  users: any[];
  title: string;
}

const CreateService = async (data: Data): Promise<Chat> => {
  const { ownerId, companyId, users, title } = data;

  const record = await Chat.create({
    ownerId,
    companyId,
    title
  });

  await ChatUser.findOrCreate({ where: { chatId: record.id, userId: ownerId }, defaults: { unreads: 0 } as any });
  if (Array.isArray(users) && users.length > 0) {
    const ids = Array.from(new Set(users.map(user => +user.id).filter(id => id && id !== ownerId)));
    for (const userId of ids) {
      await ChatUser.findOrCreate({ where: { chatId: record.id, userId }, defaults: { unreads: 0 } as any });
    }
  }

  await record.reload({
    include: [
      { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] },
      { model: User, as: "owner" }
    ]
  });

  return record;
};

export default CreateService;
