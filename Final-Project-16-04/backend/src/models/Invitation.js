const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Invitation",
  tableName: "invitations",
  columns: {
    id: { 
      primary: true, 
      type: "int", 
      generated: true 
    },
    teamId: { 
      type: "int",
      nullable: false
    },
    inviteeId: { 
      type: "int",
      nullable: false
    },
    status: { 
      type: "varchar", 
      length: 32, 
      nullable: false,
      default: "pending" 
    },
    createdAt: { 
      type: "datetime",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)"
    }
  }
}); 