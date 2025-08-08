const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Team",
  tableName: "teams",
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
    creator_id: {
      type: "int",
      nullable: false,
    },
    createdAt: {
      type: "timestamp",
      nullable: false,
      default: () => "CURRENT_TIMESTAMP"
    },
    description: {
      type: "text",
      nullable: true,
    },
    visibility: {
      type: "varchar",
      length: 20,
      nullable: false,
      default: "private",
    },
    updatedAt: {
      type: "timestamp",
      nullable: false,
      default: () => "CURRENT_TIMESTAMP",
      onUpdate: "CURRENT_TIMESTAMP"
    }
  },
  relations: {
    creator: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "creator_id" }
    }
  }
}); 