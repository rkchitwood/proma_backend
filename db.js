"use strict";
/** Database setup for proma.  */
const { Client } = require("pg");
const { getDatabaseUri } = require('./config');

let db;

if (process.env.NODE_ENV === "production") {
    db = new Client({
        connectionString: getDatabaseUri(),
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    db = new Client({
        connectionString: getDatabaseUri()
    });
}

// Automatically connect if not in a test environment
if (!getDatabaseUri().includes("test")) {
    (async () => {
        await db.connect();
    })();
}

module.exports = db;