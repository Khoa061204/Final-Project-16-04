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
      type: "longtext",
      nullable: true
    },
    s3Key: {
      type: "varchar",
      length: 512,
      nullable: true
    },
    userId: {
      type: "int"
    },
    createdAt: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    },
    updatedAt: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    },
    folder_id: {
      type: "int",
      nullable: true
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