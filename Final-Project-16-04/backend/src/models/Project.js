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
            length: 255,
            nullable: false
        },
        description: {
            type: "text",
            nullable: true
        },
        teamId: {
            type: "int",
            nullable: true
        },
        createdAt: {
            type: "timestamp",
            precision: 6,
            nullable: false,
            default: () => "CURRENT_TIMESTAMP(6)"
        },
        updatedAt: {
            type: "timestamp",
            precision: 6,
            nullable: false,
            default: () => "CURRENT_TIMESTAMP(6)",
            onUpdate: "CURRENT_TIMESTAMP(6)"
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