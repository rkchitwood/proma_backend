const jwt = require("jsonwebtoken");
const { createToken } = require("./tokens");
const { SECRET_KEY } = require("../config");

describe("createToken", function () {
    test("works: not pm", function() {
        const token = createToken({ id: 1, email: "test", isPm: false });
        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            id: 1,
            email: "test",
            isPm: false
        });
    });

    test("works: is pm", function() {
        const token = createToken({ id: 1, email: "test", isPm: true });
        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            id: 1,
            email: "test",
            isPm: true
        });
    });

    test("works: default no pm", function() {
        const token = createToken({ id: 1, email: "test" });
        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            id: 1,
            email: "test",
            isPm: false
        });
    });
});