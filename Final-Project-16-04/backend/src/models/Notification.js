const { EntitySchema } = require("typeorm");

const Notification = new EntitySchema({
  name: "Notification",
  tableName: "notifications",
  columns: {
    id: { 
      primary: true, 
      type: "int", 
      generated: true
    },
    userId: { 
      type: "int",
      nullable: false
    },
    type: { 
      type: "varchar", 
      length: 50,
      nullable: false
    }, // 'deadline', 'invitation', 'file_share', 'document_share', 'task_assigned'
    title: { 
      type: "varchar", 
      length: 255,
      nullable: false
    },
    message: { 
      type: "text",
      nullable: false
    },
    data: { 
      type: "json", 
      nullable: true 
    }, // Additional data like projectId, taskId, etc.
    isRead: { 
      type: "tinyint", 
      nullable: false,
      default: 0
    },
    createdAt: { 
      type: "datetime",
      precision: 6,
      nullable: false,
      default: () => "CURRENT_TIMESTAMP(6)"
    }
  },
  indices: [
    {
      name: "idx_notification_user",
      columns: ["userId"]
    },
    {
      name: "idx_notification_type", 
      columns: ["type"]
    },
    {
      name: "idx_notification_read",
      columns: ["isRead"]
    },
    {
      name: "idx_notification_created",
      columns: ["createdAt"]
    }
  ]
});

module.exports = Notification; 