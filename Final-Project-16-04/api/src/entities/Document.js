// api/src/entities/Document.js
const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Document",
  tableName: "documents",
  columns: {
    id: {
      primary: true,
      type: "uuid", 
      generated: "uuid",
    },
    title: {
      type: "varchar",
      length: 255,
      default: "Untitled Document"
    },
    content: {
      type: "text",
      default: "{}"
    },
    userId: {
      type: "uuid"
    },
    createdAt: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    },
    updatedAt: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    }
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "userId"
      },
      onDelete: "CASCADE"
    }
  }
});