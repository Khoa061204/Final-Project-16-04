const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Message",
  tableName: "messages",
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
    userId: { 
      type: "int",
      nullable: false
    },
    message: { 
      type: "text",
      nullable: false
    },
    createdAt: { 
      type: "datetime",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)"
    }
  }
}); 