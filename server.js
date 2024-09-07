"use strict";

const app = require('./app');
const { PORT } = require("./config");

app.listen(PORT, function() {
    console.log(`server started on http://localhost:${PORT}`);
});