"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { BCRYPT_WORK_FACTOR } = require("../config");
const { NotFoundError, UnauthorizedError, BadRequestError } = require("../expressError");

/** SQL/JS abstraction functions for users. */

class User {    
    /** authenticate user from email and password.
     * 
     * Returns an instance of user (without password)
     *  { id, email, firstName, lastName, isPm}
     * 
     * Raises UnauthorizedError if invalid.
     */
    static async authenticate(email, password) {
        const result = await db.query(
            `SELECT id,
                    email,
                    password,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    is_pm AS "isPm"
                FROM users
                WHERE email = $1`,
            [email],
        );
        const user = result.rows[0];

        if (user) {
            const authorized = await bcrypt.compare(password, user.password);
            if (authorized === true) {
                delete user.password;
                return user;
            }
        }
        throw new UnauthorizedError("Invalid email/password");
    }

    /** Register user. 
     *  
     * Returns an instance of user (without password)
     *  { id, email, firstName, lastName, isPm}
     * 
     * Raises BadRequestError on duplicates
    */
    static async register(
        { email, password, firstName, lastName, isPm }) {
        const duplicate = await db.query(
            `SELECT email
             FROM users
             WHERE email = $1`,
            [email]
        );
        if (duplicate.rows[0]) throw new BadRequestError("duplicate email");
        const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
        const result = await db.query(
            `INSERT INTO users
            (email,
             password,
             first_name,
             last_name,
             is_pm)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, first_name AS "firstName", last_name AS "lastName", is_pm AS "isPm"`,
            [
                email,
                hashedPassword,
                firstName,
                lastName,
                isPm
            ]   
        );
        const user = result.rows[0];
        return user;
    }

    /** Fetch a user by their unique email
     * 
     * Returns an instance of user (without password)
     *  email => { id, email, firstName, lastName, isPm}
     */
    static async getByEmail(email) {
        const result = await db.query(
            `SELECT id,
                    email,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    is_pm AS "isPm"
                FROM users
                WHERE email = $1`,
            [email],
        );
        const user = result.rows[0];
        if (!user) throw new NotFoundError("no user found");
        return user;
    }

    /** Fetch all users associated with a user through shared boards
     * Returns [ { id, email, firstName, lastName, isPm }, ... ]
     */
    static async getAllFromSharedBoards(userId) {
        // check for user
        const userCheck = await db.query(
            `SELECT id
             FROM users
             WHERE id=$1`,
            [userId]
        );
        const user = userCheck.rows[0];
        if (!user) throw new NotFoundError("No user found");

        // continue to query for associated users
        const result = await db.query(
            `SELECT DISTINCT id,
                    email,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    is_pm AS "isPm"
             FROM users u
             JOIN boards_users bu1 ON u.id=bu1.user_id
             JOIN boards_users bu2 ON bu1.board_id=bu2.board_id
             WHERE bu2.user_id=$1`,
            [userId]
        );
        const users = result.rows;
        return users;
    }

    /** Fetch user by ID
     * { userId } => { user }
     *      Where user is { id, email, firstName, lastName, isPm }
     */
    static async getById(userId) {
        const result = await db.query(
            `SELECT id,
                    email,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    is_pm AS "isPm"
                FROM users
                WHERE id = $1`,
            [userId],
        );
        const user = result.rows[0];
        if (!user) throw new NotFoundError("no user found");
        return user;
    }

    /** Update user (self) with data 
     * { fieldsToUpdate } => { updatedUser }
     * Allows for partial update, only changes provided fields
     * 
     * Data can include any of { email, firstName, lastName, password }
     * 
     * WARNING: This function can change password
     * Ensure calling function validates authorization.
    */
    static async updateByUser(userId, data) {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
        }
        const jsToSql = {
            firstName: "first_name",
            lastName: "last_name"
        }
        const { sqlSetCols, values } = sqlForPartialUpdate(
            data,
            jsToSql
        );
        const idSqlIndex = "$" + (values.length + 1);
        const query = `UPDATE users 
                       SET ${sqlSetCols} 
                       WHERE id = ${idSqlIndex} 
                       RETURNING id,
                                 email,
                                 first_name AS "firstName",
                                 last_name AS "lastName",
                                 is_pm AS "isPm"`;
        const result = await db.query(query, [...values, userId]);
        const user = result.rows[0];

        if (!user) throw new NotFoundError("No user found");

        return user;
    }

    /** Update user PM status
     * { userId } => { updatedUser }
     * Promotes user to PM, throws BadRequestError if already PM
     * 
     * WARNING: This function can change PM status
     * Ensure calling function validates authorization.
     */
    static async promoteToPm(userId) {
        const userPmCheck = await db.query(
            `SELECT id, is_pm AS "isPm"
             FROM users
             WHERE id=$1`,
            [userId]
        );
        const preUpdateUser = userPmCheck.rows[0];
        if (!preUpdateUser) throw new NotFoundError("no user found");
        if (preUpdateUser.isPm) throw new BadRequestError("user already PM");
        const result = await db.query(
            `UPDATE users
             SET is_pm=TRUE
             WHERE id=$1
             RETURNING id,
                       email,
                       first_name AS "firstName",
                       last_name AS "lastName",
                       is_pm AS "isPm"`,
            [userId]
        );
        const user = result.rows[0];
        return user;
    }
}
module.exports = User;