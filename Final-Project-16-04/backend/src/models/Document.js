// backend/src/models/Document.js
const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Document",
  tableName: "documents",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      length: 36,
      generated: "uuid",
    },
    title: {
      type: "varchar",
      length: 255,
      nullable: false,
      default: "Untitled Document"
    },
    content: {
      type: "longtext",
      nullable: true
    },
    userId: {
      type: "int",
      nullable: false
    },
    createdAt: {
      type: "timestamp",
      nullable: false,
      default: () => "CURRENT_TIMESTAMP"
    },
    updatedAt: {
      type: "timestamp",
      nullable: false,
      default: () => "CURRENT_TIMESTAMP"
    },
    s3Key: {
      type: "varchar",
      length: 512,
      nullable: true
    },
    folder_id: {
      type: "int",
      nullable: true
    },
    is_favorite: {
      type: "boolean",
      nullable: false,
      default: false,
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
    },
    folder: {
      type: "many-to-one",
      target: "Folder",
      joinColumn: {
        name: "folder_id"
      },
      onDelete: "SET NULL"
    }
  }
});