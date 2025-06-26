const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Task",
  tableName: "tasks",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true
    },
    title: {
      type: "varchar",
      length: 255,
      nullable: false
    },
    description: {
      type: "text",
      nullable: true
    },
    projectId: {
      type: "int",
      nullable: false
    },
    assignedUserId: {
      type: "int",
      nullable: true
    },
    status: {
      type: "enum",
      enum: ["To Do", "In Progress", "Done"],
      default: "To Do"
    },
    priority: {
      type: "enum",
      enum: ["Low", "Medium", "High"],
      nullable: true
    },
    dueDate: {
      type: "date",
      nullable: true
    },
    createdAt: {
      type: "datetime",
      createDate: true
    },
    updatedAt: {
      type: "datetime",
      updateDate: true
    },
    completedByUserId: {
      type: "int",
      nullable: true
    },
    completedAt: {
      type: "datetime",
      nullable: true
    },
    userStory: {
      type: "varchar",
      nullable: true
    },
    storyPoints: {
      type: "int",
      nullable: true
    }
  },
  relations: {
    project: {
      type: "many-to-one",
      target: "Project",
      joinColumn: {
        name: "projectId"
      },
      inverseSide: "tasks"
    },
    assignedUser: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "assignedUserId"
      },
      nullable: true,
      inverseSide: "assignedTasks"
    },
    completedByUser: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "completedByUserId"
      },
      nullable: true
    }
  }
}); 