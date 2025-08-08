const { EntitySchema } = require("typeorm");

const Share = new EntitySchema({
  name: "Share",
  tableName: "shares",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true
    },
    resourceType: {
      type: "enum",
      enum: ["file", "document", "folder", "project"],
      nullable: false
    },
    resourceId: {
      type: "varchar",
      length: 255,
      nullable: false,
      comment: "Resource ID - can be integer (files/folders/projects) or UUID (documents)"
    },
    userId: {
      type: "int",
      nullable: false,
      comment: "The user who owns/shared the resource"
    },
    sharedWith: {
      type: "int",
      nullable: false,
      comment: "The user who received the share"  
    },
    permission: {
      type: "enum", 
      enum: ["view", "edit", "admin"],
      default: "view",
      nullable: false
    },
    sharedVia: {
      type: "enum",
      enum: ["direct", "team", "public"],
      default: "direct",
      nullable: false
    },
    teamId: {
      type: "int",
      nullable: true,
      comment: "If shared via team, the team ID"
    },
    expiresAt: {
      type: "datetime",
      nullable: true,
      comment: "When the share expires (optional)"
    },
    message: {
      type: "text",
      nullable: true,
      comment: "Optional message when sharing"
    },
    isActive: {
      type: "boolean",
      default: true,
      nullable: false
    },
    lastAccessedAt: {
      type: "datetime",
      nullable: true
    },
    createdAt: {
      type: "datetime",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)"
    },
    updatedAt: {
      type: "datetime", 
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)",
      onUpdate: "CURRENT_TIMESTAMP(6)"
    }
  },
  indices: [
    {
      name: "idx_resource",
      columns: ["resourceType", "resourceId"]
    },
    {
      name: "idx_shared_with", 
      columns: ["sharedWith"]
    },
    {
      name: "idx_user",
      columns: ["userId"]
    },
    {
      name: "idx_team",
      columns: ["teamId"]
    },
    {
      name: "idx_active",
      columns: ["isActive"]
    }
  ],
  relations: {
    owner: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "userId" },
      cascade: false
    },
    recipient: {
      type: "many-to-one", 
      target: "User",
      joinColumn: { name: "sharedWith" },
      cascade: false
    },
    team: {
      type: "many-to-one",
      target: "Team", 
      joinColumn: { name: "teamId" },
      cascade: false
    }
  }
});

module.exports = Share; 