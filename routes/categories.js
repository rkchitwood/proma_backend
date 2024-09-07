"use strict";

/** User routes */

const express = require("express");
const { ensureLoggedIn } = require("../middleware/auth");
const Category = require("../models/category");


const router = express.Router();

/** GET / => [ { category } ]
 *  Returns a list of all categories and IDs
 * 
 * Authorization required: user
*/
router.get("/", ensureLoggedIn, async function(req, res, next) {
    try {
        const categories = await Category.getAll();
        return res.json({ categories });
    } catch(err) {
        return next(err);
    }
})

module.exports = router;