
const db = require("../config/db");

// Get all employees
const getAllEmployees = async () => {
    const [rows] = await db.promise().execute(
        `SELECT
            e.id,
            e.name,
            e.email,
            e.phone,
            e.role,
            e.department,
            e.designation,
            e.status,
            ed.employee_code AS employeeCode,
            ed.date_of_birth AS dateOfBirth,
            ed.blood_group AS bloodGroup,
            ed.emergency_contact AS emergencyContact,
            ed.address AS address,
            ed.joining_date AS joiningDate,
            ed.photo_path AS photoPath
        FROM employees e
        LEFT JOIN employee_details ed
            ON e.id = ed.employee_id
        ORDER BY e.created_at DESC`
    );

    return rows;
};


const getEmployeeById = async (employeeId) => {
    const [rows] = await db.promise().execute(
        `SELECT
            e.id,
            e.name,
            e.email,
            e.phone,
            e.role,
            e.department,
            e.designation,
            e.status,

            ed.employee_code AS employeeCode,
            ed.date_of_birth AS dateOfBirth,
            ed.blood_group AS bloodGroup,
            ed.emergency_contact AS emergencyContact,

            -- Employee address, joining date and photo
            ed.address AS address,
            ed.joining_date AS joiningDate,
            ed.photo_path AS photoPath,

            ed.pan_number AS panNumber,
            ed.aadhaar_number AS aadhaarNumber

        FROM employees e
        LEFT JOIN employee_details ed
            ON e.id = ed.employee_id

        WHERE e.id = ?`,
        [employeeId]
    );

    return rows[0] || null;
};

// Find employee for login using email, phone, or employee code
const findEmployeeForLogin = async (identifier) => {
    const [rows] = await db.promise().execute(
        `SELECT
            e.id,
            e.name,
            e.email,
            e.phone,
            e.password_hash AS passwordHash,
            e.role,
            e.status,
            ed.employee_code AS employeeCode
        FROM employees e
        LEFT JOIN employee_details ed
            ON e.id = ed.employee_id
        WHERE
            e.email = ?
            OR e.phone = ?
            OR ed.employee_code = ?
        LIMIT 1`,
        [identifier, identifier, identifier]
    );

    return rows[0] || null;
};


// Add a new employee
const createEmployee = async (employee, details) => {
    const connection = db.promise();

    try {
        // Start database transaction
        await connection.beginTransaction();

        // Insert main employee information
        await connection.execute(
            `INSERT INTO employees
            (
                id,
                name,
                email,
                phone,
                password_hash,
                role,
                department,
                designation,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                employee.id,
                employee.name,
                employee.email,
                employee.phone,
                employee.passwordHash,
                "employee",
                employee.department,
                employee.designation,
                "active"
            ]
        );

        // Insert additional employee details
        await connection.execute(
            `INSERT INTO employee_details
            (
                employee_id,
                employee_code,
                date_of_birth,
                blood_group,
                emergency_contact,
                address,
                joining_date,
                pan_number,
                aadhaar_number,
                photo_path
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                employee.id,
                details.employeeCode,
                details.dateOfBirth,
                details.bloodGroup,
                details.emergencyContact,
                details.address || null,
                details.joiningDate || null,
                details.panNumber,
                details.aadhaarNumber,
                details.photoPath
            ]
        );

        // Save both inserts
        await connection.commit();

        return {
            id: employee.id,
            name: employee.name,
            email: employee.email
        };

    } catch (error) {
        // Undo both inserts if anything fails
        await connection.rollback();
        throw error;
    }
};



const updateEmployee = async (employeeId, employee, details) => {
    // Get an individual connection from the MySQL pool
    const connection = await db.promise().getConnection();

    try {
        // Start transaction
        await connection.beginTransaction();

        // Update main employee table
        const [employeeResult] = await connection.execute(
            `UPDATE employees
             SET
                name = ?,
                email = ?,
                phone = ?,
                department = ?,
                designation = ?
             WHERE id = ?`,
            [
                employee.name,
                employee.email,
                employee.phone,
                employee.department,
                employee.designation,
                employeeId
            ]
        );

        // Verify employee exists
        if (employeeResult.affectedRows === 0) {
            const [existingEmployee] = await connection.execute(
                "SELECT id FROM employees WHERE id = ?",
                [employeeId]
            );

            if (existingEmployee.length === 0) {
                throw new Error("Employee not found");
            }
        }

        // Update employee_details table
        const [detailsResult] = await connection.execute(
            `UPDATE employee_details
             SET
                employee_code = ?,
                date_of_birth = ?,
                blood_group = ?,
                emergency_contact = ?,
                address = ?,
                joining_date = ?,
                pan_number = ?,
                aadhaar_number = ?,
                photo_path = COALESCE(?, photo_path)
             WHERE employee_id = ?`,
            [
                details.employeeCode,
                details.dateOfBirth,
                details.bloodGroup,
                details.emergencyContact,
                details.address || null,
                details.joiningDate || null,
                details.panNumber,
                details.aadhaarNumber,
                details.photoPath || null,
                employeeId
            ]
        );

        // Verify employee details exist
        if (detailsResult.affectedRows === 0) {
            const [existingDetails] = await connection.execute(
                "SELECT employee_id FROM employee_details WHERE employee_id = ?",
                [employeeId]
            );

            if (existingDetails.length === 0) {
                throw new Error("Employee details not found");
            }
        }

        // Commit transaction
        await connection.commit();

        return {
            success: true,
            message: "Employee updated successfully"
        };

    } catch (error) {
        // Roll back if any query fails
        await connection.rollback();
        throw error;

    } finally {
        // Always release the connection back to the pool
        connection.release();
    }
};

// Update employee active/inactive status
const updateEmployeeStatus = async (employeeId, status) => {
    const [result] = await db.promise().execute(
        `UPDATE employees
         SET status = ?
         WHERE id = ?`,
        [status, employeeId]
    );

    if (result.affectedRows === 0) {
        const [rows] = await db.promise().execute(
            "SELECT id FROM employees WHERE id = ?",
            [employeeId]
        );

        if (rows.length === 0) {
            throw new Error("Employee not found");
        }
    }

    return {
        success: true,
        message: `Employee status updated to ${status}`
    };
};


// Export model functions
module.exports = {
    getAllEmployees,
    getEmployeeById,
    findEmployeeForLogin,
    createEmployee,
    updateEmployee,
    updateEmployeeStatus
};