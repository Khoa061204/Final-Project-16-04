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
      type: "longtext",
      nullable: true
    },
    last_login: {
      type: "timestamp",
      nullable: true
    },
    theme: {
      type: "varchar",
      length: 20,
      nullable: true,
      default: "system"
    },
    emailNotifications: {
      type: "boolean",
      nullable: true,
      default: true
    },
    pushNotifications: {
      type: "boolean",
      nullable: true,
      default: true
    },
    twoFactorEnabled: {
      type: "boolean",
      nullable: true,
      default: false
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