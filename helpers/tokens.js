const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

/** Return signed JWT from user data.  */

function createToken(user) {
    console.assert(user.isPm !== undefined,
        "createToken passed user without isPm property"
    );

    let payload = {
        id: user.id,
        email: user.email,
        isPm: user.isPm || false,
    };
    
    return jwt.sign(payload, SECRET_KEY);
}

module.exports = { createToken };