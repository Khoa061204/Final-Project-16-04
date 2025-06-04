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
    uploaded_at: {
      type: "timestamp",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)",
    },
    folder_id: {
      type: "char",
      length: 36,
      nullable: true,
    },
    shared_with: {
      type: "simple-json",
      nullable: true,
      default: '[]'
    },
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