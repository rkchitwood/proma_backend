"use strict";

/** Project routes */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureUserOnBoardOfProject, ensureUserOnProjectOrPm, ensurePm, ensureLoggedIn } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const Project = require("../models/project");
const Session = require("../models/session");
const projectUpdateSchema = require("../schemas/projectUpdate.json");
const projectUserAddSchema = require("../schemas/projectUserAdd.json");
const sessionNewSchema = require("../schemas/sessionNew.json");

const router = express.Router();

/** GET / => [ { project }, ... ] 
 *      Where project is { id, name, priority, stage, boardId }
 *  returns a list of all projects assigned to user, or if PM all projects under the PM's domain
 * 
 * Authorization required: user
*/
router.get("/", ensureLoggedIn, async function(req, res, next) {
    try {
        const { user } = res.locals;
        if (user.isPm) {
            // return all projects on PM's boards
            const projects = await Project.getAllProjectsFromUsersBoards(user.id);
            return res.json({ projects });
        } else {
            // return all projects assigned to user
            const projects = await Project.getUserProjects(user.id);
            return res.json({ projects });
        }
    } catch(err) {
        return next(err);
    }
});

/** GET /[projectId] => { project } 
 *      Where project is { id, name, priority, stage, boardId }
 * Returns project data
 * 
 * Authorization required: user on board
*/
router.get("/:projectId", ensureLoggedIn, ensureUserOnBoardOfProject, async function(req, res, next) {
    try {
        const { projectId } = req.params;
        const project = await Project.getById(projectId);
        return res.json({ project })
    } catch(err) {
        return next(err);
    }
});

/** PATCH /[projectId] { fieldsToUpdate } => { updatedBoard } 
 * Update project.
 * Fields can include { name, priority, stage }
 * Returns { id, name, priority, stage, boardId }
 * 
 * Authorization required: PM on board
*/
router.patch("/:projectId", ensurePm, ensureUserOnBoardOfProject, async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, projectUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const project = await Project.update(req.params.projectId, req.body)
        return res.json({ project });
    } catch(err) {
        return next(err);
    }
});

/** GET /[projectId]/users => [ { user }, ... ]
 *      Where user is { id, email, firstName, lastName, isPm }
 * Returns list of users on a project.
 * 
 * Authorization required: user on board
*/
router.get("/:projectId/users", ensureLoggedIn, ensureUserOnBoardOfProject, async function(req, res, next) {
    try {
        const { projectId } = req.params;
        const users = await Project.getProjectUsers(projectId);
        return res.json({ users });
    } catch(err) {
        return next(err);
    }
});

/** POST /[projectId]/users { userId } => { user } 
 *      Where user is { id, email, firstName, lastName, isPm }
 * Adds user to project, updates DB and returns user.
 * 
 * Authorization required: PM on board
*/
router.post("/:projectId/users", ensurePm, ensureUserOnBoardOfProject, async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, projectUserAddSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const { projectId } = req.params;
        const { userId } = req.body;
        const user = await Project.addUserToProject(userId, projectId);
        return res.status(201).json({ user });
    } catch(err) {
        return next(err);
    }
});

/** DELETE /[projectId]/users { userId } => { removed: id } 
 * Removes a user by ID from the project and returns a confirmation message.
 * 
 * Authorization required: PM on board
*/
router.delete("/:projectId/users", ensurePm, ensureUserOnBoardOfProject, async function(req, res, next) {
    try {
        const { projectId } = req.params;
        const { userId } = req.body;
        await Project.removeUserFromProject(userId, projectId);
        return res.json({ removed: +userId });
    } catch(err) {
        return next(err);
    }
});

/** GET /[projectId]/sessions => [ { session }, ... ]
 *      Where session is { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
 * 
 * Authorization required: user on board
 */
router.get("/:projectId/sessions", ensureLoggedIn, ensureUserOnBoardOfProject, async function(req, res, next) {
    try {
        const { projectId } = req.params;
        const sessions = await Session.getProjectSessions(projectId);
        return res.json({ sessions });
    } catch(err) {
        return next(err);
    }
});

/** POST /[projectId]/sessions { session } => { session }
 *      Where session is { id, projectId, userId, startDatetime, endDatetime, categoryId, comment }
 * Creates a session from data, required data { projectId, userId, categoryId }
 * 
 * Authorization required: PM on board or correct user
 */
router.post("/:projectId/sessions", ensureLoggedIn, ensureUserOnProjectOrPm, async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, sessionNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const { projectId } = req.params;
        const { userId, categoryId } = req.body;
        const session = await Session.create({ projectId, userId, categoryId });
        return res.status(201).json({ session });
    } catch(err) {
        return next(err);
    }
});

module.exports = router;
