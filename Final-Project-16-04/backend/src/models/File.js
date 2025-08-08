const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "File",
  tableName: "files",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    user_id: {
      type: "int",
      nullable: false,
    },
    file_name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    file_url: {
      type: "text",
      nullable: false,
    },
    s3Key: {
      type: "varchar",
      length: 512,
      nullable: true,
    },
    uploaded_at: {
      type: "timestamp",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)",
    },
    folder_id: {
      type: "int",
      nullable: true,
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
        name: "user_id"
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