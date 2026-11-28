
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

const filePath = path.join(
    __dirname,
    "../../nivsee-crm/db.json"
);

const rawData = fs.readFileSync(filePath, "utf-8");
const data = JSON.parse(rawData);
const employees = data.employees;

const migrateEmployees = async () => {
    try {
        // Start transaction
        await db.promise().beginTransaction();

        for (const employee of employees) {

            const hashedPassword = await bcrypt.hash(
                employee.password,
                10
            );

            // Insert employee
            await db.promise().execute(
                `INSERT INTO employees
                (id, name, email, phone, password_hash,
                 role, department, designation, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    employee.id,
                    employee.name,
                    employee.email,
                    employee.phone,
                    hashedPassword,
                    employee.role,
                    employee.department,
                    employee.designation,
                    employee.status
                ]
            );

            // Insert employee details
            await db.promise().execute(
                `INSERT INTO employee_details
                (employee_id, employee_code, date_of_birth,
                 blood_group, emergency_contact)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    employee.id,
                    employee.employeeDetails.employeeId,
                    employee.employeeDetails.dateOfBirth,
                    employee.employeeDetails.bloodGroup,
                    employee.employeeDetails.emergencyContact
                ]
            );
        }

        await db.promise().commit();

        console.log("Employee migration completed successfully!");
        console.log(`Total employees migrated: ${employees.length}`);

    } catch (error) {
        await db.promise().rollback();

        console.error("Employee migration failed:", error.message);

    } finally {
        db.end();
    }
};

migrateEmployees();
