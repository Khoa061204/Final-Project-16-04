const { EntitySchema } = require("typeorm");

const Notification = new EntitySchema({
  name: "Notification",
  tableName: "notifications",
  columns: {
    id: { 
      primary: true, 
      type: "varchar", 
      length: 255, 
      generated: "uuid" 
    },
    userId: { 
      type: "int"
    },
    type: { 
      type: "varchar", 
      length: 50 
    }, // 'deadline', 'invitation', 'file_share', 'document_share', 'task_assigned'
    title: { 
      type: "varchar", 
      length: 255 
    },
    message: { 
      type: "text" 
    },
    data: { 
      type: "json", 
      nullable: true 
    }, // Additional data like projectId, taskId, etc.
    isRead: { 
      type: "boolean", 
      default: false 
    },
    createdAt: { 
      type: "datetime", 
      createDate: true 
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