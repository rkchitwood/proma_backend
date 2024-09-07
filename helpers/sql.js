const { BadRequestError } = require("../expressError");

/**
 * Helper function for making selective update sql queries.
 * 
 * Return value can be used to create SET clause of an UPDATE statement.
 * 
 * @param dataToUpdate {Object} {field1: newVal1, field2: newVal2, ...}
 * @param jsToSql {Object} maps JS named data fields to SQL names,
 *      ex: { columnName: "column_name", another_field: "another_field" }
 * 
 * @returns {Object} {sqlSetCols, values}
 * 
 * @example 
 *      const dataToUpdate = {email: "example@example.com", isPm: "true"};
 *      const jsToSql = { email: "email", isPm: "is_pm" };
 *      sqlForPartialUpdate(dataToUpdate, jsToSql) => 
 *      { 
 *          sqlSetCols: '"email"=$1, "is_pm"=$2',
 *          values: ['example@example.com', true] 
 *      }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
    const keys = Object.keys(dataToUpdate);
    if (keys.length === 0) throw new BadRequestError("no data");
    const columns = keys.map((columnName, idx) =>
        `"${jsToSql[columnName] || columnName}"=$${idx + 1}`,
    );
    return {
        sqlSetCols: columns.join(", "),
        values: Object.values(dataToUpdate)
    };
}
module.exports = { sqlForPartialUpdate };