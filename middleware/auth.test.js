"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../expressError");
const {
    authenticateJWT,
    ensureLoggedIn,
    ensurePm,
    ensureCorrectUserOrPm
} = require("./auth");

const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ id: 1, email: "test", isPm: false }, SECRET_KEY);
const badJwt = jwt.sign({ id: 1, email: "test", isPm: false }, "not secret key");


describe("authenticateJWT", function() {
    test("works: via header", function() {
        expect.assertions(2);
        const req = { headers: { authorization: `Bearer ${testJwt}` } };
        const res = { locals: {} };
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({
            user: {
                iat: expect.any(Number),
                id: expect.any(Number),
                email: "test",
                isPm: false,
            }
        });
    });

    test("works: no header", function() {
        expect.assertions(2);
        const req = { headers: { authorization: `Bearer ${badJwt}` } };
        const res = { locals: {} };
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({});
    });

    test("works: invalid token", function() {
        expect.assertions(2);
        const req = { headers: { authorization: `Bearer ${badJwt}` } };
        const res = { locals: {} };
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({});
    });
});

describe("esnureLoggedIn", function() {
    test("works", function() {
        expect.assertions(1);
        const req = {};
        const res = { locals: { user : { id: 1, email: "test", isPm: true } } };
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        ensureLoggedIn(req, res, next);
    });

    test("unauthorized if not logged in", function() {
        expect.assertions(1);
        const req = {};
        const res = { locals: {} };
        const next = function(err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        }
        ensureLoggedIn(req, res, next);
    });
});

describe("ensurePm", function() {
    test("works", function() {
        expect.assertions(1);
        const req = {};
        const res = { locals: { user: { id: 1, email: "test", isPm: true } } };
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        ensurePm(req, res, next);
    });

    test("unauthorized error if not PM", function() {
        expect.assertions(1);
        const req = {};
        const res = { locals: { user: { is: 1, email: "test", isPm: false } } };
        const next = function(err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        }
        ensurePm(req, res, next);
    });

    test("aunauthorized error if anonymous", function() {
        expect.assertions(1);
        const req = {};
        const res = { locals: {} };
        const next = function(err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        }
        ensurePm(req, res, next);
    });
});

describe("ensureCorrectUserOrPm", function() {
    test("works: pm", function() {
        expect.assertions(1);
        const req = { params: { id: 1 } };
        const res = { locals: { user: { id: 2, email: "test", isPm: true } } };
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        ensureCorrectUserOrPm(req, res, next);
    });

    test("works: same user", function() {
        expect.assertions(1);
        const req = { params: { userId: 1 } };
        const res = { locals: { user: { id: 1, email: "test", isPm: false } } };
        const next = function(err) {
            expect(err).toBeFalsy();
        }
        ensureCorrectUserOrPm(req, res, next);
    });

    test("unauthorized error if mismatched IDs", function() {
        expect.assertions(1);
        const req = { params: { id: 1 } };
        const res = { locals: { user: { id: 2, email: "test", isPm: false } } };
        const next = function(err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        }
        ensureCorrectUserOrPm(req, res, next);
    });

    test("unauthorized error if anonymous", function() {
        expect.assertions(1);
        const req = { params: { id: 1 } };
        const res = { locals: {} };
        const next = function(err) {
            expect(err instanceof UnauthorizedError).toBeTruthy();
        }
        ensureCorrectUserOrPm(req, res, next);
    });
});