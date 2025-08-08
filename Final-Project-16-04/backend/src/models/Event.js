const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Event",
  tableName: "events",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    title: {
      type: "varchar",
      length: 255,
      nullable: false
    },
    description: {
      type: "text",
      nullable: true,
    },
    start: {
      type: "datetime",
      nullable: false
    },
    end: {
      type: "datetime",
      nullable: false
    },
    allDay: {
      type: "tinyint",
      nullable: false,
      default: 0
    },
    userId: {
      type: "int",
      nullable: false
    },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "userId",
      },
      onDelete: "CASCADE",
    },
  },
}); 