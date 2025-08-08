const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "TeamMember",
  tableName: "team_members",
  columns: {
    team_id: {
      primary: true,
      type: "int",
      nullable: false,
    },
    user_id: {
      primary: true,
      type: "int",
      nullable: false,
    },
    role: {
      type: "varchar",
      length: 50,
      nullable: false,
      default: "member"
    },
    joined_at: {
      type: "timestamp",
      nullable: false,
      default: () => "CURRENT_TIMESTAMP"
    }
  }
  // Removed relations to avoid circular references
}); 