"use strict";

/** Project routes */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureUserOnSessionBoard, ensureUserOnSessionOrPm } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const Session = require("../models/session");
const sessionUpdateSchema = require("../schemas/sessionUpdate.json");


const router = express.Router();

/** GET / => [ { session } ] 
 *      Where session is { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
 * 
 * Authorization required: user
*/
router.get("/", ensureLoggedIn, async function(req, res, next) {
    try {
        const { user } = res.locals;
        if (user.isPm) {
            // return all sessions on PM's boards
            const sessions = await Session.getAllSessionsFromUsersBoards(user.id);
            return res.json({ sessions });
        } else {
            // return all sessions recorded by user
            const sessions = await Session.getSessionsByUserId(user.id);
            return res.json({ sessions });
        }
    } catch(err) {
        return next(err);
    }
});

/** GET/[sessionId] => { session } 
 *      Where session is { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
 * 
 * Authorization required: user on board of session
*/
router.get("/:sessionId", ensureLoggedIn, ensureUserOnSessionBoard, async function(req, res, next) {
    try {
        const { sessionId } = req.params;
        const session = await Session.getById(sessionId);
        return res.json({ session });
    } catch(err) {
        return next(err);
    }
});

/** PATCH /[sessionId] { fieldToUpdate } => { updatedSession }
 * Update a session.
 * Fields can include { startDatetime, endDatetime, categoryId, comment }
 * Returns { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
 * 
 * Authorization required: user's session or PM on session's board
 */
router.patch("/:sessionId", ensureLoggedIn, ensureUserOnSessionOrPm, async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, sessionUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const session = await Session.update(req.params.sessionId, req.body);
        return res.json({ session });
    } catch(err) {
        return next(err);
    }
});

/** DELETE /[sessionId] => { deleted: id } 
 * Deletes a session record and returns a confirmation message.
 * 
 * Authorization required: user's session or PM on session's board
*/
router.delete("/:sessionId", ensureLoggedIn, ensureUserOnSessionOrPm, async function(req, res, next) {
    try {
        await Session.delete(req.params.sessionId);
        return res.json({ deleted: +req.params.sessionId });
    } catch(err) {
        return next(err);
    }
});

module.exports = router;