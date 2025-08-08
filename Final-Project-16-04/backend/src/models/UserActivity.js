const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "UserActivity",
  tableName: "user_activities",
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
    activity_type: {
      type: "varchar",
      length: 100,
      nullable: false,
    },
    activity_description: {
      type: "text",
      nullable: false,
    },
    resource_type: {
      type: "varchar",
      length: 50,
      nullable: true,
    },
    resource_id: {
      type: "int",
      nullable: true,
    },
    metadata: {
      type: "json",
      nullable: true,
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
      joinColumn: { name: "user_id" },
      inverseSide: "activities"
    }
  },
  indices: [
    {
      name: "idx_user_activities_user_id",
      columns: ["user_id"]
    },
    {
      name: "idx_user_activities_created_at",
      columns: ["created_at"]
    },
    {
      name: "idx_user_activities_type",
      columns: ["activity_type"]
    }
  ]
});