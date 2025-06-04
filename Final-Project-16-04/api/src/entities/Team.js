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
    creatorId: {
      type: "int",
      nullable: false,
      name: "creator_id"
    },
    createdAt: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    }
  },
  relations: {
    creator: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "creator_id" }
    },
    members: {
      type: "many-to-many",
      target: "User",
      joinTable: {
        name: "team_members",
        joinColumn: { name: "team_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "user_id", referencedColumnName: "id" }
      }
    }
  }
}); 