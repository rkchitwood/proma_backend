"use strict";

/** Authentication routes */

const jsonschema = require("jsonschema");

const User = require("../models/user");
const express = require("express");
const router = new express.Router();
const { createToken } = require("../helpers/tokens");
const userAuthSchema = require("../schemas/userAuth.json");
const userRegisterSchema = require("../schemas/userRegister.json");
const { BadRequestError } = require("../expressError");

/** POST /auth/token: { username, password } => { JWT token }
 * 
 * Returns a JWT token
*/

router.post("/token", async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, userAuthSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const { email, password } = req.body;
        const user = await User.authenticate(email, password);
        const token = createToken(user);
        return res.json({ token, user });
    } catch(err) {
        return next(err);
    }
});

/** POST /auth/register: { user } => { token, user } 
 * 
 * Returns JWT token
*/

router.post("/register", async function(req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, userRegisterSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const newUser = await User.register({ ...req.body });
        const token = createToken(newUser);
        return res.status(201).json({ token, user: newUser  });
    } catch(err) {
        return next(err);
    }
});

module.exports = router;