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
    },
    description: {
      type: "text",
      nullable: true,
    },
    start: {
      type: "datetime",
    },
    end: {
      type: "datetime",
    },
    allDay: {
      type: "boolean",
      default: false,
    },
    userId: {
      type: "int",
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