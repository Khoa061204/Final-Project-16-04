const { EntitySchema } = require("typeorm");

const TeamMember = new EntitySchema({
  name: "TeamMember",
  tableName: "team_members",
  columns: {
    team_id: { 
      primary: true,
      type: "int"
    },
    user_id: { 
      primary: true,
      type: "int"
    },
    role: { 
      type: "varchar", 
      length: 16,
      default: "user"
    },
    joined_at: { 
      type: "datetime", 
      createDate: true 
    }
  },
  relations: {
    team: {
      type: "many-to-one",
      target: "Team",
      joinColumn: {
        name: "team_id",
        referencedColumnName: "id"
      }
    },
    user: {
      type: "many-to-one", 
      target: "User",
      joinColumn: {
        name: "user_id",
        referencedColumnName: "id"
      }
    }
  },
  indices: [
    {
      name: "idx_team_member_team",
      columns: ["team_id"]
    },
    {
      name: "idx_team_member_user",
      columns: ["user_id"]
    },
    {
      name: "idx_team_member_unique",
      columns: ["team_id", "user_id"],
      unique: true
    }
  ]
});

module.exports = TeamMember; 