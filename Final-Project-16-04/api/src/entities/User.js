const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true
    },
    username: {
      type: "varchar",
      length: 255,
      nullable: false
    },
    email: {
      type: "varchar",
      length: 255,
      nullable: false
    },
    password: {
      type: "varchar",
      length: 255,
      nullable: false
    },
    created_at: {
      type: "timestamp",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)"
    },
    updated_at: {
      type: "timestamp",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)",
      onUpdate: "CURRENT_TIMESTAMP(6)"
    },
    avatar_url: {
      type: "varchar",
      length: 10000,
      nullable: true
    }
  },
  relations: {
    assignedTasks: {
      type: "one-to-many",
      target: "Task",
      inverseSide: "assignedUser"
    }
  }
});
