const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
    test("works: 1 item", function () {
        const result = sqlForPartialUpdate(
            { email: "example@example.com" },
            { email: "email", random: "random" });
        expect(result).toEqual({
            sqlSetCols: '"email"=$1',
            values: ["example@example.com"],
        });
    });

    test("works: 2 items", function () {
        const result = sqlForPartialUpdate(
            { shape: "square", isCool: "false" },
            { isCool: "is_cool" });
        expect(result).toEqual({
            sqlSetCols: '"shape"=$1, "is_cool"=$2',
            values: ["square", "false"],
        });
    });
});