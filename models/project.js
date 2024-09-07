"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError } = require("../expressError");


/** SQL/JS abstraction functions for Projects. */

class Project {
    /** Create a project for a board from data, update db and return project
     * { name, priority, boardId } => { id, name, priority, stage, boardId}
     */
    static async create({ name, priority, boardId}) {
        // ensure board exists
        const boardCheck = await db.query(
            `SELECT id
             FROM boards
             WHERE id=$1`,
            [boardId]
        );
        const board = boardCheck.rows[0];
        if (!board) throw new NotFoundError("board does not exist");

        // continue with creating project
        const result = await db.query(
            `INSERT INTO projects (name,
                                   priority,
                                   board_id)
                VALUES ($1, $2, $3)
                RETURNING id, name, priority, stage, board_id AS "boardId"`,
            [
                name,
                priority,
                boardId
            ]
        );
        const project = result.rows[0];
        return project;
    }

    /** Get all projects on a given board
     * { boardId } => [ { project } ... ]
     *      where project is { id, name, priority, stage, boardId }
     */
    static async getBoardProjects(boardId) {
        // ensure board exists
        const boardCheck = await db.query(
            `SELECT id
             FROM boards
             WHERE id=$1`,
            [boardId]
        );
        const board = boardCheck.rows[0];
        if (!board) throw new NotFoundError("no board found");

        // continue to get list of projects, grouped by stages
        const result = await db.query(
            `SELECT id, name, priority, stage, board_id AS "boardId"
             FROM projects p
             WHERE p.board_id=$1
             ORDER BY stage ASC`,
            [boardId]
        );
        const projects = result.rows;
        return projects;
    }

    /** Get project by ID 
     * { projectId } => { project }
     *      where project is { id, name, priority, stage, boardId }
    */
    static async getById(projectId) {
        const result = await db.query(
            `SELECT id, name, priority, stage, board_id AS "boardId"
             FROM projects
             WHERE id=$1`,
            [projectId]
        );
        const project = result.rows[0];
        if (!project) throw new NotFoundError("no project found");
        return project;
    }

    /** Get all projects for a given user
     * { userId } => [ { project }, ... ]
     *      where project is { id, name, priority, stage, boardId }
     */
    static async getUserProjects(userId) {
        // ensure user exists
        const userCheck = await db.query(
            `SELECT id
             FROM users
             WHERE id=$1`,
            [userId]
        );
        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError("no user found");

        const result = await db.query(
            `SELECT p.id AS "id",
                    p.name AS "name",
                    p.priority AS "priority",
                    p.stage AS "stage",
                    p.board_id AS "boardId"
             FROM projects p
             JOIN projects_users pu ON p.id=pu.project_id 
             WHERE pu.user_id=$1`,
            [userId]
        );
        const projects = result.rows;
        return projects;
    }

    /** Update project from data
     * { fieldToUpdate } => { updatedProject }
     * Allows for partial update, only changes provided fields
     * 
     * Data can include any of { name, priority, stage }
     * Returns { id, name, priority, stage, boardId }
     */
    static async update(projectId, data) {
        const { sqlSetCols, values } = sqlForPartialUpdate(
            data,
            {}
        );
        const idSqlIndex = "$" + (values.length + 1);
        const query = `UPDATE projects
                       SET ${sqlSetCols}
                       WHERE id=${idSqlIndex}
                       RETURNING id,
                                 name,
                                 priority,
                                 stage,
                                 board_id AS "boardId"`;
        const result = await db.query(query, [...values, projectId]);
        const project = result.rows[0];

        if (!project) throw new NotFoundError("no project found");

        return project;
    }

    /** Get list of users on project
     * { projectId } => [ { user }, ... ]
     *      Where user is { id, email, firstName, lastName, isPm }
     */
    static async getProjectUsers(projectId) {
        // check for project
        const projCheck = await db.query(
            `SELECT id
             FROM projects
             WHERE id=$1`,
            [projectId]
        );
        const project = projCheck.rows[0];
        if (!project) throw new NotFoundError("no project found");

        // continue with retrieval of users
        const result = await db.query(
            `SELECT u.id AS "id", 
                    u.email AS "email", 
                    u.first_name AS "firstName", 
                    u.last_name AS "lastName", 
                    u.is_pm AS "isPm"
             FROM users u
             JOIN projects_users pu ON u.id=pu.user_id
             WHERE pu.project_id=$1`,
            [projectId]
        );
        const users = result.rows;
        return users;
    }

    /** Add user to project
     * { userId, projectId } => { project }
     *       where project is { id, name, priority, stage, boardId }
     * updates DB M:M table
     */
    static async addUserToProject(userId, projectId) {
        // check for project
        const projCheck = await db.query(
            `SELECT id
             FROM projects
             WHERE id=$1`,
            [projectId]
        );
        const project = projCheck.rows[0];
        if (!project) throw new NotFoundError("no project found");

        // ensure user exists
        const userCheck = await db.query(
            `SELECT id
             FROM users
             WHERE id=$1`,
            [userId]
        );
        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError("no user found");

        await db.query(
            `INSERT INTO projects_users (project_id, user_id)
             VALUES ($1, $2)
             RETURNING user_id AS "userId", project_id AS "projectId"`,
            [projectId, userId]
        );
        return user;
    }

    /** Remove user from project.
     * { userId, projectId } => undefined
     * deletes from DB M:M table
     */
    static async removeUserFromProject(userId, projectId) {
         // check for project
         const projCheck = await db.query(
            `SELECT id
             FROM projects
             WHERE id=$1`,
            [projectId]
        );
        const project = projCheck.rows[0];
        if (!project) throw new NotFoundError("no project found");

        // ensure user exists
        const userCheck = await db.query(
            `SELECT id
             FROM users
             WHERE id=$1`,
            [userId]
        );
        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError("no user found");

        // delete from projects_users and return undefined
        await db.query(
            `DELETE 
             FROM projects_users
             WHERE user_id=$1 AND project_id=$2`,
            [userId, projectId]
        );
    }

    /** Fetch all projects on all of a user's boards
     * { userId } => [ { project }, ... ]
     *      where project is { id, name, priority, stage, boardId }
     */
    static async getAllProjectsFromUsersBoards(userId) {
        // ensure user exists
        const userCheck = await db.query(
            `SELECT id
             FROM users
             WHERE id=$1`,
            [userId]
        );
        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError("no user found");

        const result = await db.query(
            `SELECT p.id AS "id",
                    p.name AS "name",
                    p.priority AS "priority",
                    p.stage AS "stage",
                    p.board_id AS "boardId"
             FROM projects p JOIN boards b
                ON p.board_id=b.id
                JOIN boards_users bu
                    ON b.id=bu.board_id
                WHERE bu.user_id=$1
                ORDER BY p.stage ASC`,
            [userId]
        );
        const projects = result.rows;
        return projects;
    }

    /** Check if user is assigned a specific project by IDs 
     * { userId, projectId } => bool
    */
    static async isUserOnProject(userId, projectId) {
        const result = await db.query(
            `SELECT user_id
             FROM projects_users
             WHERE user_id=$1 AND project_id=$2`,
            [userId, projectId]
        );
        return result.rows.length > 0;
    }
}

module.exports = Project;