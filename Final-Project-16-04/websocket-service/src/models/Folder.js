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
    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    user_id: {
      type: "int",
      nullable: false,
    },
    parent_id: {
      type: "int",
      nullable: true,
    },
    path: {
      type: "varchar",
      length: 1000,
      nullable: true,
    },
    created_at: {
      type: "timestamp",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)",
    }
  },
  relations: {
    parent: {
      type: "many-to-one",
      target: "Folder",
      joinColumn: {
        name: "parent_id"
      },
      onDelete: "SET NULL"
    },
    children: {
      type: "one-to-many",
      target: "Folder",
      inverseSide: "parent"
    }
  }
}); 