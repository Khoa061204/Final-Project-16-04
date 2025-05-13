const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "varchar",
      length: 255,
      name: "id"
    },
    username: {
      type: "varchar",
      length: 255,
      nullable: false
    },
    email: {
      type: "varchar",
      length: 255,
      nullable: false
    },
    password: {
      type: "varchar",
      length: 255,
      nullable: false
    }
  },
});
