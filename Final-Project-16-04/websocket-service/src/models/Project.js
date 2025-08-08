const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
    name: "Project",
    tableName: "projects",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true
        },
        name: {
            type: "varchar",
            length: 255
        },
        description: {
            type: "text",
            nullable: true
        },
        createdAt: {
            type: "timestamp",
            createDate: true
        },
        updatedAt: {
            type: "timestamp",
            updateDate: true
        },
        dueDate: {
            type: "date",
            nullable: true
        }
    },
    relations: {
        team: {
            type: "many-to-one",
            target: "Team",
            joinColumn: {
                name: "teamId"
            }
        },
        documents: {
            type: "one-to-many",
            target: "Document",
            inverseSide: "project"
        },
        tasks: {
            type: "one-to-many",
            target: "Task",
            inverseSide: "project"
        }
    }
}); 