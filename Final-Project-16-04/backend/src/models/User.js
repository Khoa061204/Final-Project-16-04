const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    username: {
      type: "varchar",
      length: 255,
      nullable: false,
    },
    email: {
      type: "varchar",
      length: 255,
      nullable: false,
      unique: true,
    },
    password: {
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
    updated_at: {
      type: "timestamp",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)",
    },
    last_login: {
      type: "timestamp",
      nullable: true,
    },
    theme: {
      type: "varchar",
      length: 20,
      nullable: true,
      default: "system",
    },
    emailNotifications: {
      type: "tinyint",
      nullable: true,
      default: 1,
    },
    pushNotifications: {
      type: "tinyint",
      nullable: true,
      default: 1,
    },
    twoFactorEnabled: {
      type: "tinyint",
      nullable: true,
      default: 0,
    },
    avatar_url: {
      type: "longtext",
      nullable: true,
    }
  },
  relations: {
    documents: {
      type: "one-to-many",
      target: "Document",
      inverseSide: "user"
    },
    files: {
      type: "one-to-many",
      target: "File",
      inverseSide: "user"
    },
    folders: {
      type: "one-to-many",
      target: "Folder",
      inverseSide: "user"
    }
  }
}); 