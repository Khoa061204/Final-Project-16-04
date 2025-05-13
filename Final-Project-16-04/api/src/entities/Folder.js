const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Folder",
  tableName: "folders",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    user_id: {
      type: "uuid",
      nullable: false,
    },
    name: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    parent_id: {
      type: "uuid",
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
    },
    updated_at: {
      type: "timestamp",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)",
      onUpdate: "CURRENT_TIMESTAMP(6)",
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