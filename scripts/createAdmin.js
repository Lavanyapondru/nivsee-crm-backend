require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("../config/db");

const createAdmin = async () => {
    try {
        const name = process.env.ADMIN_NAME;
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;

        // Check whether admin already exists
        const [existing] = await db.promise().execute(
            "SELECT id FROM admins WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            console.log("Admin already exists!");
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert admin into database
        await db.promise().execute(
            `INSERT INTO admins (name, email, password)
             VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );

        console.log("Admin created successfully!");

    } catch (error) {
        console.log("Error creating admin:", error.message);

    } finally {
        db.end();
    }
};

createAdmin();