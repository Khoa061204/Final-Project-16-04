const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Invitation",
  tableName: "invitations",
  columns: {
    id: { primary: true, type: "int", generated: true },
    teamId: { type: "int" },
    inviteeId: { type: "int" },
    status: { type: "varchar", length: 32, default: "pending" },
    createdAt: { type: "datetime", createDate: true }
  }
}); 