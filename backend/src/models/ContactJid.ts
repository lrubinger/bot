import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  AllowNull, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, Index
} from "sequelize-typescript";
import Contact from "./Contact";
import Whatsapp from "./Whatsapp";

@Table
class ContactJid extends Model<ContactJid> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Index
  @Column
  companyId: number;

  @AllowNull(false)
  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @AllowNull(false)
  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @AllowNull(false)
  @Index
  @Column
  jid: string;

  @BelongsTo(() => Contact)
  contact: Contact;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
export default ContactJid;
