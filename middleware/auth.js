"use strict";

/** Middleware to handle common authorization cases from routes. */

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');
const { UnauthorizedError } = require('../expressError');
const Board = require("../models/board");
const Project = require("../models/project");
const Session = require("../models/session");
const User = require("../models/user");

/**Middleware: authenticate user.
 * 
 * If a token is provided, verify it and store on res.locals 
 * if valid. Not an error for no token or failed verify
 */

function authenticateJWT(req, res, next) {
    try {
        const authHeader = req.headers && req.headers.authorization;
        if (authHeader) {
            const token = authHeader.replace(/^[Bb]earer /, "").trim();
            res.locals.user = jwt.verify(token, SECRET_KEY);
        }
        return next();
    } catch (err) {
        return next();
    }
}

/** Middleware: ensure user is logged in.
 * 
 *  Raises Unauthorized if not
 */

function ensureLoggedIn(req, res, next) {
    try {
        if (!res.locals.user) throw new UnauthorizedError();
        return next();
    } catch (err) {
        return next(err);
    }
}

/** Middleware: ensure user is pm user 
 * 
 * Raises Unauthorized if not
*/

function ensurePm(req, res, next) {
    try {
        if (!res.locals.user || !res.locals.user.isPm) {
            throw new UnauthorizedError();
        }
        return next();
    } catch (err) {
        return next(err);
    }
}

/** Middleware: ensure user is admin or user that matches route param user ID
 * 
 * Raises Unauthorized if not
 */

function ensureCorrectUserOrPm(req, res, next) {
    try {
        const user = res.locals.user;
        if (!(user && (user.isPm || +user.id === parseInt(req.params.userId, 10)))) {
            throw new UnauthorizedError();
        }
        return next();
    } catch (err) {
        return next(err);
    }
}

/** Middleware: ensures logged in user is on the board in params
 * 
 * Raises Unauthorized if not
 */

async function ensureUserOnBoard(req, res, next) {
    try {
        const user = res.locals.user;
        const boardId = req.params.boardId;
        const isUserOnBoard = await Board.isUserOnBoard(user.id, boardId);
        if (!isUserOnBoard) throw new UnauthorizedError();
        return next();
    } catch(err) {
        return next(err);
    }
}

/** Middleware: ensures user is a member of the board that hosts the project
 * 
 * Raises Unauthorized if not
 */
async function ensureUserOnBoardOfProject(req, res, next) {
    try {
        const user = res.locals.user;
        const projectId = req.params.projectId;
        const project = await Project.getById(projectId);
        const boardId = project.boardId;
        const isUserOnBoard = await Board.isUserOnBoard(user.id, boardId);
        if (!isUserOnBoard) throw new UnauthorizedError();
        return next();
    } catch(err) {
        return next(err);
    }
}

/** Middleware: ensures user is a member of the board that hosts the project session
 * 
 * Raises Unauthorized if not
 */
async function ensureUserOnSessionBoard(req, res, next) {
    try {
        const user = res.locals.user;
        const sessionId = req.params.sessionId;
        const boardId  = await Session.getBoardId(sessionId);
        const isUserOnBoard = await Board.isUserOnBoard(user.id, boardId);
        if (!isUserOnBoard) throw new UnauthorizedError();
        return next();
    } catch(err) {
        return next(err);
    }
}

/** Middleware: ensures user is author of session or PM on board
 * 
 * Raises Unauthorized if not
 */
async function ensureUserOnSessionOrPm(req, res, next) {
    
    try {
        const user = res.locals.user;
        const sessionId = req.params.sessionId;
        const session = await Session.getById(sessionId);
        const project = await Project.getById(session.projectId);
        const isPmOnBoard = await Board.isUserOnBoard(user.id, project.boardId);

        if (!(session.userId === user.id || (user.isPm && isPmOnBoard))) {
            throw new UnauthorizedError();
        }

        return next();
    } catch(err) {
        return next(err);
    }
}

/** Middleware: ensure user is on project or PM on board
 * 
 * Raises Unauthorized if not
 */
async function ensureUserOnProjectOrPm(req, res, next) {
    try {
        const user = res.locals.user;
        const projectId = req.params.projectId;
        const project = await Project.getById(projectId);
        const isUserOnProject = await Project.isUserOnProject(user.id, projectId);
        const isPmOnBoard = await Board.isUserOnBoard(user.id, project.boardId);
        if (!(isUserOnProject || isPmOnBoard)) {
            throw new UnauthorizedError();
        }
        return next();
    } catch(err) {
        return next(err);
    }
}

/** Middleware: ensure user is PM on shared boards or user that matches route params
 * 
 * Raises Unauthorized if not
 */
async function ensureCorrectUserOrSharedBoardPm(req, res, next) {
    try {
        const user = res.locals.user;
        const sharedUsers = await User.getAllFromSharedBoards(req.params.userId);
        const isSharedUser = sharedUsers.some(sharedUser => sharedUser.id === user.id);
        if (!(user.id === req.params.userId || (user.isPm && isSharedUser))) {
            throw new UnauthorizedError();
        }
        return next();
    } catch(err) {
        return next(err);
    }
}
/** Middleware: ensure logged in user user is on a shared board of parameter user
 * 
 * Raises Unauthorized if not
 */
async function ensureUserOnSharedBoard(req, res, next) {
    try {
        const loggedInUser = res.locals.user;
        const sharedUsers = await User.getAllFromSharedBoards(req.params.userId);
        const isSharedUser = sharedUsers.some(sharedUser => sharedUser.id === loggedInUser.id)
        if (!isSharedUser) {
            throw new UnauthorizedError();
        }
        return next();
    } catch(err) {
        return next(err);
    }    
}


module.exports = {
    authenticateJWT,
    ensureLoggedIn,
    ensurePm,
    ensureCorrectUserOrPm,
    ensureUserOnBoard,
    ensureUserOnBoardOfProject,
    ensureUserOnSessionBoard,
    ensureUserOnSessionOrPm,
    ensureUserOnProjectOrPm,
    ensureCorrectUserOrSharedBoardPm,
    ensureUserOnSharedBoard
};