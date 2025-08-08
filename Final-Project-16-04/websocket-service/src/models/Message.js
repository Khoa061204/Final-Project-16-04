const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Message",
  tableName: "messages",
  columns: {
    id: { primary: true, type: "int", generated: true },
    teamId: { type: "int" },
    userId: { type: "int" },
    message: { type: "text" },
    createdAt: { type: "datetime", createDate: true }
  }
}); 