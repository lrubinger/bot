import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey, AutoIncrement,
  ForeignKey, BelongsTo, DataType
} from "sequelize-typescript";
import User from "./User";
import Company from "./Company";

@Table
class InternalChatMessage extends Model<InternalChatMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @Column
  senderId: number;

  @BelongsTo(() => User, "senderId")
  sender: User;

  @ForeignKey(() => User)
  @Column
  recipientId: number;

  @BelongsTo(() => User, "recipientId")
  recipient: User;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.DATE)
  readAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
export default InternalChatMessage;
