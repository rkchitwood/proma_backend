"use strict";

const db = require("../db");
const {  NotFoundError } = require("../expressError");

/** SQL/JS abstraction functions for boards. */

class Board {
    /** finds all boards matching userID.
     * (userId) => [ {id, title}, ... ]
      */
     static async findAllForUser(userId) {
        // check for user first
        const userCheck = await db.query(
            `SELECT id
             FROM users
             WHERE id=$1`,
            [userId]
        );
        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError("no user found");

        // continue with desired query
        const result = await db.query(
            `SELECT b.id, b.title
             FROM boards AS b
             JOIN boards_users AS bu ON b.id = bu.board_id
             WHERE bu.user_id=$1
             ORDER BY title`,
            [userId]
        );
        return result.rows;
     }

     /** Create a board, update DB and return new board 
      * { title } => { id, title }
     */
    static async create({ title }) {
        const result = await db.query(
            `INSERT INTO boards (title)
             VALUES ($1)
             RETURNING id, title`,
            [title]
        );
        return result.rows[0];
    }

    /** add a user to board via userID and boardID
     * { userId, boardId } => { userId, boardId }
     */
    static async addUserToBoard({userId, boardId}) {
        // check for board existence first
        console.log("userId, boardId: ", userId, boardId);
        const boardCheck = await db.query(
            `SELECT id
             FROM boards
             WHERE id=$1`,
            [boardId]
        );
        const board = boardCheck.rows[0];
        if (!board) throw new NotFoundError("no board found");

        // secondly, check for user
        const userCheck = await db.query(
            `SELECT id
             FROM users
             WHERE id=$1`,
            [userId]
        );
        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError("no user found");

        // continue with desired query
        const result = await db.query(
            `INSERT INTO boards_users (user_id, board_id)
             VALUES ($1, $2)
             RETURNING user_id AS "userId", board_id AS "boardId"`,
            [userId, boardId]
        );
        return result.rows[0];
    }

    /** Gets an array of users and their data that are assigned to a board 
     * { boardId } => [{ id, email, first_name, last_name, isPm }, ...]
    */
    static async getBoardUsers(boardId) {
        // ensure board exists
        const boardCheck = await db.query(
            `SELECT id
             FROM boards
             WHERE id=$1`,
            [boardId]
        );
        const board = boardCheck.rows[0];
        if (!board) throw new NotFoundError("no board found");

        // continue to fetch board users
        const result = await db.query(
            `SELECT u.id AS "id",
                    u.email AS "email",
                    u.first_name AS "firstName",
                    u.last_name AS "lastName",
                    u.is_pm AS "isPm"
                FROM users AS u
                JOIN boards_users AS bu ON u.id=bu.user_id
                WHERE bu.board_id=$1`,
            [boardId]
        );
        return result.rows;
    }

    /** Checks if the user is a member of the board 
     * { userId, boardId } => bool
    */
    static async isUserOnBoard(userId, boardId) {
         // ensure board exists
         const boardCheck = await db.query(
            `SELECT id
             FROM boards
             WHERE id=$1`,
            [boardId]
        );
        const board = boardCheck.rows[0];
        if (!board) throw new NotFoundError("no board found");

        // continue to check for user
        const result = await db.query(
            `SELECT 1
             FROM boards_users
             WHERE user_id=$1 AND board_id=$2`,
            [userId, boardId]
        );
        return result.rows.length > 0;
    }

    /** Get board details.
     * { boardId } => { id, title }
     */
    static async get(boardId){
        const result = await db.query(
            `SELECT id, title
             FROM boards
             WHERE id=$1`,
            [boardId]
        );
        const board = result.rows[0]
        if (!board) throw new NotFoundError("no board found");
        return board;
    }

    /** Update board details 
     * { id, title } => { id, title }
    */
    static async update({ boardId, title }) {
        const result = await db.query(
            `UPDATE boards
             SET title=$1
             WHERE id=$2
             RETURNING id, title`,
            [title, boardId]
        );
        const board = result.rows[0]
        if (!board) throw new NotFoundError("no board found");
        return board;
    }

   /** Remove user from board
    * {  userId, boardId } => undefined
    */
    static async removeUserFromBoard(userId, boardId) {
        const result = await db.query(
            `DELETE
             FROM boards_users
             WHERE user_id=$1 AND board_id=$2
             RETURNING user_id`,
            [userId, boardId]
        );
        const boardUser = result.rows[0];
        if (!boardUser) throw new NotFoundError("no board-user found");    
   }
}
module.exports = Board;