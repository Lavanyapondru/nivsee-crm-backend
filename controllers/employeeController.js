
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    updateEmployeeStatus
} = require("../models/employeeModel");
// Encrypt sensitive identity information
const encryptIdentity = (value) => {
    const key = Buffer.from(
        process.env.IDENTITY_ENCRYPTION_KEY,
        "hex"
    );

    if (key.length !== 32) {
        throw new Error("Identity encryption key must be 32 bytes");
    }

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted.toString("hex")
    ].join(":");
};
// Decrypt sensitive identity information
const decryptIdentity = (encryptedValue) => {

    // Read the same encryption key used during encryption
    const key = Buffer.from(
        process.env.IDENTITY_ENCRYPTION_KEY,
        "hex"
    );

    if (key.length !== 32) {
        throw new Error("Identity encryption key must be 32 bytes");
    }

    // Separate IV, authentication tag and encrypted data
    const [ivHex, authTagHex, encryptedHex] =
        encryptedValue.split(":");

    // Convert hexadecimal values into buffers
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    // Create the AES-256-GCM decipher
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    // Verify the authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt the original value
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    return decrypted.toString("utf8");
};

// Get all employees
const fetchAllEmployees = async (req, res) => {
    try {
        const employees = await getAllEmployees();

        return res.status(200).json({
            success: true,
            message: "Employees fetched successfully",
            count: employees.length,
            employees
        });

    } catch (error) {
    console.error("Fetch All Employees Error:", error);

    return res.status(500).json({
        success: false,
        message: "Unable to fetch employees",
        error: error.message
    });
}
};


// Get one employee with decrypted identity details (Admin only)
const fetchEmployeeById = async (req, res) => {
    try {
        // Get employee ID from URL
        const { id } = req.params;

        // Fetch employee details from MySQL
        const employee = await getEmployeeById(id);

        // Check whether employee exists
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Decrypt PAN only when encrypted data exists
        const panNumber = employee.panNumber
            ? decryptIdentity(employee.panNumber)
            : "";

        // Decrypt Aadhaar only when encrypted data exists
        const aadhaarNumber = employee.aadhaarNumber
            ? decryptIdentity(employee.aadhaarNumber)
            : "";

        // Return complete employee details
        return res.status(200).json({
            success: true,
            message: "Employee details fetched successfully",
            employee: {
                ...employee,
                panNumber,
                aadhaarNumber
            }
        });

    } catch (error) {
        // Log the actual error in backend terminal
        console.error("FETCH EMPLOYEE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch employee details",
            error: error.message
        });
    }
};


// Add a new employee
const addEmployee = async (req, res) => {
    try {
       const {
    name,
    email,
    phone,
    department,
    designation,
    password,
    employeeId,
    dateOfBirth,
    bloodGroup,
    emergencyContact,
    address,
    joiningDate,
    panNumber,
    aadhaarNumber
} = req.body;

        // Validate required fields
        if (
            !name?.trim() ||
            !email?.trim() ||
            !phone?.trim() ||
            !department?.trim() ||
            !designation?.trim() ||
            !password ||
            !employeeId?.trim() ||
            !dateOfBirth ||
            !bloodGroup ||
            !emergencyContact?.trim() ||
            !panNumber?.trim() ||
            !aadhaarNumber?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "All employee fields are required"
            });
        }

        // Validate employee photo
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Employee photo is required"
            });
        }

        // Validate PAN format
        const pan = panNumber.trim().toUpperCase();

        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
            return res.status(400).json({
                success: false,
                message: "Invalid PAN number format"
            });
        }

        // Validate Aadhaar format
        const aadhaar = aadhaarNumber.replace(/\s/g, "");

        if (!/^[0-9]{12}$/.test(aadhaar)) {
            return res.status(400).json({
                success: false,
                message: "Aadhaar number must contain 12 digits"
            });
        }

        // Hash employee password
        const passwordHash = await bcrypt.hash(password, 12);

        // Generate internal employee ID
        const employeeDbId = crypto.randomUUID();

        // Prepare employee information
        const employee = {
            id: employeeDbId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            passwordHash,
            department: department.trim(),
            designation: designation.trim()
        };

       // Prepare additional employee details
const details = {
    employeeCode: employeeId.trim().toUpperCase(),
    dateOfBirth,
    bloodGroup,
    emergencyContact: emergencyContact.trim(),

    // New fields
    address: address?.trim() || null,
    joiningDate: joiningDate || null,

    // Encrypt sensitive identity information
    panNumber: encryptIdentity(pan),
    aadhaarNumber: encryptIdentity(aadhaar),

    // Save employee photo path
    photoPath: `/uploads/employees/${req.file.filename}`
};

        // Save employee and additional details
        const newEmployee = await createEmployee(
            employee,
            details
        );

        return res.status(201).json({
            success: true,
            message: "Employee added successfully",
            employee: newEmployee
        });

    } catch (error) {
        console.error("Add Employee Error:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Email or Employee ID already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to add employee"
        });
    }
};
// Update an existing employee
const editEmployee = async (req, res) => {
    try {
        const { id } = req.params;
const {
    name,
    email,
    phone,
    department,
    designation,
    employeeId,
    dateOfBirth,
    bloodGroup,
    emergencyContact,
    address,
    joiningDate,
    panNumber,
    aadhaarNumber
} = req.body;

        // Check required employee fields
        if (
            !name?.trim() ||
            !email?.trim() ||
            !phone?.trim() ||
            !department?.trim() ||
            !designation?.trim() ||
            !employeeId?.trim() ||
            !dateOfBirth ||
            !bloodGroup ||
            !emergencyContact?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "All required employee fields must be provided"
            });
        }

        // Retrieve existing employee details
        const existingEmployee = await getEmployeeById(id);

        if (!existingEmployee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Start with the existing encrypted identity values
        let encryptedPan = existingEmployee.panNumber;
        let encryptedAadhaar = existingEmployee.aadhaarNumber;

        // Update PAN only when a new value is provided
        if (panNumber?.trim()) {
            const pan = panNumber.trim().toUpperCase();

            if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid PAN number format"
                });
            }

            encryptedPan = encryptIdentity(pan);
        }

        // Update Aadhaar only when a new value is provided
        if (aadhaarNumber?.trim()) {
            const aadhaar = aadhaarNumber.replace(/\s/g, "");

            if (!/^[0-9]{12}$/.test(aadhaar)) {
                return res.status(400).json({
                    success: false,
                    message: "Aadhaar number must contain 12 digits"
                });
            }

            encryptedAadhaar = encryptIdentity(aadhaar);
        }

        // Prepare updated employee information
        const employee = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            department: department.trim(),
            designation: designation.trim()
        };

       // Prepare additional employee details
const details = {
    employeeCode: employeeId.trim().toUpperCase(),
    dateOfBirth,
    bloodGroup,
    emergencyContact: emergencyContact.trim(),

    // New fields
    address: address?.trim() || null,
    joiningDate: joiningDate || null,

    // Preserve existing encrypted values if fields are blank
    panNumber: encryptedPan,
    aadhaarNumber: encryptedAadhaar,

    // Keep existing photo if no new photo is uploaded
    photoPath: req.file
        ? `/uploads/employees/${req.file.filename}`
        : null
};

        // Update employee in MySQL
        await updateEmployee(id, employee, details);

        return res.status(200).json({
            success: true,
            message: "Employee updated successfully"
        });

    } catch (error) {
        console.error("Update Employee Error:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Email or Employee ID already exists"
            });
        }

        if (
            error.message === "Employee not found" ||
            error.message === "Employee details not found"
        ) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to update employee"
        });
    }
};

// Activate or deactivate an employee
const changeEmployeeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Accept only these two status values
        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee status"
            });
        }

        await updateEmployeeStatus(id, status);

        return res.status(200).json({
            success: true,
            message: `Employee ${status === "active" ? "activated" : "deactivated"} successfully`,
            status
        });

    } catch (error) {
        console.error("Change Employee Status Error:", error);

        return res.status(
            error.message === "Employee not found" ? 404 : 500
        ).json({
            success: false,
            message: error.message || "Unable to update employee status"
        });
    }
};
// Export controller functions
module.exports = {
    fetchAllEmployees,
    fetchEmployeeById,
    addEmployee,
    editEmployee,
    changeEmployeeStatus
};
