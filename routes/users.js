"use strict";

/** User routes */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureCorrectUserOrSharedBoardPm, ensureUserOnSharedBoard } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const userEditSchema = require("../schemas/userEdit.json");
const userEditPmSchema = require("../schemas/userEditPm.json");

const router = express.Router();

/** GET / => [ { user }, ... ] 
 *      Where user is { id, email, firstName, lastName, isPm }
 * Returns all users on a user's boards
 * 
 * Authorization required: user
*/
router.get("/", ensureLoggedIn, async function(req, res, next) {
    try {
        const { user } = res.locals;
        const users = await User.getAllFromSharedBoards(user.id);
        return res.json({ users });
    } catch(err) {
        return next(err);
    }
});


/** GET { email } => { user }
 * Fetches a user by email to add to project or board
 * 
 * Authorization required: user
 */
router.get("/search", ensureLoggedIn, async function(req, res, next) {
    try {
        const email = req.query.email;
        const user = await User.getByEmail(email);
        return res.json(user);
    } catch(err) {
        return next(err);
    }
});

/** GET /[userId] => { user }
 *      Where user is { id, email, firstName, lastName, isPm }
 * Returns details about user
 * 
 * Authorization required: correct user or PM on users boards
 */
router.get("/:userId", ensureLoggedIn, ensureUserOnSharedBoard, async function(req, res, next) {
    try {
        const { userId } = req.params;
        const user = await User.getById(userId);
        return res.json({ user });
    } catch(err) {
        return next(err);
    }
});

/** PATCH { data } => { updatedUser } 
 * Can alter fields if user matches logged in user
 * PM can promote other users to PM
 * 
 * Authorization required: correct user or PM on users boards
*/
router.patch("/:userId", ensureLoggedIn, ensureCorrectUserOrSharedBoardPm, async function(req, res, next) {
    try {
        const { userId } = req.params;
        const loggedInUser = res.locals.user;
        if (+loggedInUser.id === +userId) {
            // allow full edit access
            const validator = jsonschema.validate(req.body, userEditSchema);
            if (!validator.valid) {
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }

            const user = await User.updateByUser(userId, req.body);
            return res.json({ user });
        } else {
            // allow PM to promote to PM
            const validator = jsonschema.validate(req.body, userEditPmSchema);
            if (!validator.valid) {
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }

            const user = await User.promoteToPm(userId);
            return res.json({ user });
        }
    } catch(err) {
        return next(err);
    }
});



module.exports = router;