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
    item_type: {
      type: "enum",
      enum: ["file", "document"]
    },
    item_id: {
      type: "int"
    },
    shared_by: {
      type: "int"
    },
    shared_with: {
      type: "varchar",
      length: 255
    },
    shared_at: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP"
    }
  },
  indices: [
    {
      name: "idx_item",
      columns: ["item_type", "item_id"]
    },
    {
      name: "idx_shared_with", 
      columns: ["shared_with"]
    }
  ]
});

module.exports = Share; 