const db = require("../config/db");

// Find admin using email
const findAdminByEmail = async (email) => {
    const [rows] = await db.promise().execute(
        "SELECT * FROM admins WHERE email = ?",
        [email]
    );

    return rows[0];
};

module.exports = {
    findAdminByEmail
};