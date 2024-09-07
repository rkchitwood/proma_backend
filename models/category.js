"use strict";

const db = require("../db");
const {  NotFoundError } = require("../expressError");

/** SQL/JS abstraction functions for Categories. */

class Category {
    /** Retrieves all categories from DB */
    static async getAll() {
        const result = await db.query(
            `SELECT id, name
            FROM categories`
        );
        return result.rows;
    }
}

module.exports = Category;