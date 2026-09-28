import { Sequelize, Op } from "sequelize";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId
}: Request): Promise<Response> => {
  const normalizedSearch = searchParam.toLowerCase().trim();
  let companyContactIds: number[] = [];

  if (normalizedSearch) {
    const companyFields = await ContactCustomField.findAll({
      where: {
        name: "Empresa",
        value: { [Op.iLike]: `%${normalizedSearch}%` }
      },
      attributes: ["contactId"]
    });

    companyContactIds = companyFields.map(field => field.contactId);
  }

  const searchConditions: any[] = [
    {
      name: Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.col("name")),
        "LIKE",
        `%${normalizedSearch}%`
      )
    },
    { number: { [Op.like]: `%${normalizedSearch}%` } },
    {
      email: Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.col("email")),
        "LIKE",
        `%${normalizedSearch}%`
      )
    }
  ];

  if (companyContactIds.length) {
    searchConditions.push({ id: { [Op.in]: companyContactIds } });
  }

  const whereCondition = {
    [Op.or]: searchConditions,
    companyId: {
      [Op.eq]: companyId
    }
  };
  const limit = 30;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export default ListContactsService;
