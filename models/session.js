"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError } = require("../expressError");

/** SQL/JS abstraction functions for Sessions. */

class Session {
    /** create a session for a project from data, update db and return session
     * { projectId, userId, categoryId } => { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
     */
    static async create({ projectId, userId, categoryId }) {
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
        // ensure category exists
        const catCheck = await db.query(
            `SELECT id
             FROM categories
             WHERE id=$1`,
            [categoryId]
        );
        const category = catCheck.rows[0];
        if (!category) throw new NotFoundError("no category found");

        // carry on with query
        const result = await db.query(
            `INSERT INTO sessions (project_id,
                                   user_id,
                                   category_id)
                VALUES ($1, $2, $3)
                RETURNING id, 
                          project_id AS "projectId", 
                          user_id AS "userId", 
                          start_datetime AS "startDatetime",
                          end_datetime AS "endDatetime",
                          category_id AS "categoryId",
                          comment`,
            [projectId, userId, categoryId]
        );
        const session = result.rows[0];
        return session;
    }

    /** Get list of all sessions on a project
     * { projectId } => [ { session }, ... ]
     *      Where session is { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
     */
    static async getProjectSessions(projectId) {
        // check for project
        const projCheck = await db.query(
            `SELECT id
             FROM projects
             WHERE id=$1`,
            [projectId]
        );
        const project = projCheck.rows[0];
        if (!project) throw new NotFoundError("no project found");

        // continue fetching sessions for project
        const result = await db.query(
            `SELECT id,
                    project_id AS "projectId",
                    user_id AS "userId",
                    start_datetime AS "startDatetime",
                    end_datetime AS "endDatetime",
                    category_id AS "categoryId",
                    comment
             FROM sessions
             WHERE project_id=$1`,
            [projectId]
        );
        const sessions = result.rows;
        return sessions;
    }

    /** Get details about a session from ID
     * { sessionId } => { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
     */
    static async getById(sessionId) {
        const result = await db.query(
            `SELECT id,
                    project_id AS "projectId",
                    user_id AS "userId",
                    start_datetime AS "startDatetime",
                    end_datetime AS "endDatetime",
                    category_id AS "categoryId",
                    comment
             FROM sessions
             WHERE id=$1`,
            [sessionId]
        );
        const session = result.rows[0];
        return session;
    }

    /** Get all sessions completed by user
     * { userId } => [ { session }, ... ]
     *      Where session is { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
     */
    static async getSessionsByUserId(userId) {
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
            `SELECT id,
                    project_id AS "projectId",
                    user_id AS "userId",
                    start_datetime AS "startDatetime",
                    end_datetime AS "endDatetime",
                    category_id AS "categoryId",
                    comment
             FROM sessions
             WHERE user_id=$1`,
            [userId]
        );
        const sessions = result.rows;
        return sessions;
    }

    /** Get all sessions on all of user's boards 
     * { userId } => [ { session }, ... ]
     *      Where session is { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
    */
    static async getAllSessionsFromUsersBoards(userId) {
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
            `SELECT s.id AS "id",
                    s.project_id AS "projectId",
                    s.user_id AS "userId",
                    s.start_datetime AS "startDatetime",
                    s.end_datetime AS "endDatetime",
                    s.category_id AS "categoryId",
                    s.comment AS "comment"
             FROM sessions s
             JOIN projects p ON s.project_id=p.id
             JOIN boards b ON p.board_id=b.id
             JOIN boards_users bu on bu.board_id=b.id
             WHERE bu.user_id=$1`,
            [userId]
        );
        const sessions = result.rows;
        return sessions;
    }

    /** Get boardId that hosts the project hosting the session 
     * { sessionId } => { boardId }
    */
    static async getBoardId(sessionId) {
        // ensure session exists
        const sessionCheck = await db.query(
            `SELECT id
             FROM sessions
             WHERE id=$1`,
            [sessionId]
        );
        const session = sessionCheck.rows[0];
        if (!session) throw new NotFoundError("no session found");

        const result = await db.query(
            `SELECT p.board_id AS "boardId"
             FROM sessions s
             JOIN projects p ON s.project_id=p.id
             WHERE s.id=$1`,
            [sessionId]
        );
        const project = result.rows[0];
        return project.boardId;
    }

    /** Update session from data
     * { fieldsToUpdate } => { updatedSession }
     * Allows for partial update, only changes provided fields
     * 
     * Data can include any of { startDatetime, endDatetime, categoryId, comment }
     */
    static async update(sessionId, data) {
        const jsToSql = {
            startDatetime: "start_datetime",
            endDatetime: "end_datetime",
            categoryId: "category_id"
        }
        const { sqlSetCols, values } = sqlForPartialUpdate(
            data,
            jsToSql
        );
        const idSqlIndex = "$" + (values.length + 1);
        const query = `UPDATE sessions
                       SET ${sqlSetCols}
                       WHERE id=${idSqlIndex}
                       RETURNING id,
                                 project_id AS "projectId",
                                 user_id AS "userId",
                                 start_datetime AS "startDatetime",
                                 end_datetime AS "endDatetime",
                                 category_id AS "categoryId",
                                 comment`;
        const result = await db.query(query, [...values, sessionId]);
        const session = result.rows[0];

        if (!session) throw new NotFoundError("No session found");

        return session;
    }

    /** Delete session by ID
     * { sessionId } => undefined
     */
    static async delete(sessionId) {
        const result = await db.query(
            `DELETE
             FROM sessions
             WHERE id=$1
             RETURNING id`,
            [sessionId]
        );
        const session = result.rows[0];
        if (!session) throw new NotFoundError("no session found");
    }    
}

module.exports = Session;