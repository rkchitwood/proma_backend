"use strict";

/** Board routes */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureUserOnBoard, ensurePm, ensureLoggedIn } = require("../middleware/auth");
const { BadRequestError, UnauthorizedError } = require("../expressError");
const Board = require("../models/board");
const Project = require("../models/project");
const boardNewSchema = require("../schemas/boardNew.json");
const boardUpdateSchema = require("../schemas/boardUpdate.json");
const boardUserAddSchema = require("../schemas/boardUserAdd.json");
const boardProjectNewSchema = require("../schemas/boardProjectNew.json");


const router = express.Router();

/** GET / => { boards: [ { id, title }, ... ]
 * 
 * Returns list of all boards user is a part of.
 * 
 * Authorization required: user.
*/
router.get("/", ensureLoggedIn, async function(req, res, next) {
    try {
        const { user } = res.locals;
        const boards = await Board.findAllForUser(user.id);
        return res.json({ boards });
    } catch(err) {
        return next(err);
    }
});

/** POST / { board } => { board } 
 * Creates a board and adds current user to board.
 * Board must be { title }
 * Returns { id, title }
 * 
 * Authorization required: PM
*/
router.post("/", ensurePm, async function(req, res, next) {
    try {
        const { user } = res.locals;
        const validator = jsonschema.validate(req.body, boardNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const board = await Board.create(req.body);
        await Board.addUserToBoard({userId: user.id, boardId: board.id});
        return res.status(201).json({ board })
    } catch(err) {
        return next(err);
    }
});

/** GET /[boardId] => { board }
 * Returns {id, title, [ { user }, ... ]}
 *  where user is {id, email, firstName, lastName, isPm}
 *  
 *  Authorization required: user on board
*/
router.get("/:boardId", ensureLoggedIn, ensureUserOnBoard, async function(req, res, next) {
    try {
        const { boardId } = req.params;
        const board = await Board.get(boardId);
        return res.json({ board });
    } catch(err) {
        return next(err);
    }
});

/** PATCH /[boardId] { updatedTitle } => { board }
 * Returns { id, title }
 * 
 * Authorization required: PM on board
*/
router.patch("/:boardId", ensurePm, ensureUserOnBoard, async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, boardUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const { title } = req.body;
        const { boardId } = req.params;
        const board = await Board.update({ boardId, title});
        return res.json({ board })
    } catch(err) {
        return next(err);
    }
});

/** GET /[boardId]/users => { boardUsers }
 * Gets all users on a board.
 * Returns [ { id, email, firstName, lastName, isPm }, ... ]
 * 
 * Authorization required: user on board
*/
router.get("/:boardId/users", ensureLoggedIn, ensureUserOnBoard, async function(req, res, next) {
    try {
        const { boardId } = req.params;
        const boardUsers = await Board.getBoardUsers(boardId);
        return res.json({ boardUsers });
    } catch(err) {
        return next(err);
    }
});

/** POST /[boardId]/users { userId } => { newBoardUser }
 * Adds a user to the board.
 * Returns { id, email, firstName, lastName, isPm }
 * 
 * Authorization required: PM on board
*/
router.post("/:boardId/users", ensurePm, ensureUserOnBoard, async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, boardUserAddSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const { boardId } = req.params;
        const { userId } = req.body;
        const newBoardUser = await Board.addUserToBoard({userId, boardId});
        return res.status(201).json({ newBoardUser });
    } catch(err) {
        return next(err);
    }
});

/** DELETE /[boardId]/users { userId } => { removed: id }
 * Removes a user from the board and returns { removed: id }
 * 
 * Authorization required: PM on board
*/
router.delete("/:boardId/users", ensurePm, ensureUserOnBoard, async function(req, res, next) {
    try {
        const { boardId } = req.params;
        const { userId } = req.body;
        await Board.removeUserFromBoard(userId, boardId);
        return res.json({ removed: +userId })
    } catch(err) {
        return next(err);
    }
});

/** GET /[boardId]/projects => [ { project }, ... ] 
 *      where project is { id, name, priority, stage, boardId }
 * Returns a list of all projects on the board
 * 
 * Authorization required: user on board
*/
router.get("/:boardId/projects", ensureLoggedIn, ensureUserOnBoard, async function(req, res, next) {
    try {
        const { boardId } = req.params;
        const boardProjects = await Project.getBoardProjects(boardId);
        return res.json({ boardProjects });
    } catch(err) {
        return next(err);
    }
});

/** POST /[boardId]/projects { newProject } => { project } 
 *      where project is { id, name, priority, stage, boardId }
 * Returns the newly created project
 * 
 * Authorization required: PM on board
*/
router.post("/:boardId/projects", ensurePm, ensureUserOnBoard, async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, boardProjectNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const { name, priority } = req.body;
        const { boardId } = req.params;
        const project = await Project.create({name, priority, boardId});
        return res.status(201).json({ project });
    } catch(err) {
        return next(err);
    }
});

module.exports = router;