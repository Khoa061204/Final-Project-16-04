const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Folder",
  tableName: "folders",
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
    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    created_at: {
      type: "timestamp",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)",
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
    }
  }
}); 