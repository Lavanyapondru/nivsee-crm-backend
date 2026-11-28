
const db = require("../config/db");

// ============================================
// ATTENDANCE MODEL
// Handles all attendance-related MySQL queries
// ============================================

// Convert MySQL BIGINT values into JavaScript numbers
const toTimestamp = (value) => {
    return value === null || value === undefined
        ? null
        : Number(value);
};

// Convert timestamp into a readable time
const formatTime = (timestamp) => {
    if (!timestamp) return null;

    return new Date(Number(timestamp)).toLocaleTimeString(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );
};


// ============================================
// 1. CHECK IN
// ============================================

const checkIn = async (attendance) => {
    const {
        employeeId,
        date,
        checkIn
    } = attendance;

    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        // Insert employee check-in
        const [result] = await connection.execute(
            `INSERT INTO attendance
            (
                employee_id,
                attendance_date,
                check_in,
                status,
                report_submitted
            )
            VALUES (?, ?, ?, 'working', FALSE)`,
            [employeeId, date, checkIn]
        );

        await connection.commit();

        return {
            id: result.insertId,
            employeeId,
            date,
            checkIn: Number(checkIn),
            checkInTime: formatTime(checkIn),
            checkOut: null,
            checkOutTime: null,
            breaks: [],
            report: null,
            reportSubmitted: false
        };

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};


// ============================================
// 2. GET ONE ATTENDANCE RECORD
// ============================================

const getAttendanceById = async (attendanceId) => {

    // Get attendance and employee information
    const [rows] = await db.promise().execute(
        `SELECT
            a.id,
            a.employee_id AS employeeId,
            ed.employee_code AS employeeCode,
            e.name AS employeeName,
           DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS date,
            a.check_in AS checkIn,
            a.check_out AS checkOut,
            a.status,
            a.report_submitted AS reportSubmitted

        FROM attendance a

        INNER JOIN employees e
            ON a.employee_id = e.id

        LEFT JOIN employee_details ed
            ON e.id = ed.employee_id

        WHERE a.id = ?`,
        [attendanceId]
    );

    if (rows.length === 0) {
        return null;
    }

    const record = rows[0];

    // Get all breaks for this attendance
    const [breakRows] = await db.promise().execute(
        `SELECT
            break_start AS start,
            break_end AS end
         FROM attendance_breaks
         WHERE attendance_id = ?
         ORDER BY break_start ASC`,
        [attendanceId]
    );

    // Get submitted work report
    const [reportRows] = await db.promise().execute(
        `SELECT
            classes_conducted AS classesConducted,
            topics_covered AS topicsCovered,
            projects_worked AS projectsWorked,
            tasks_completed AS tasksCompleted,
            pending_tasks AS pendingTasks,
            remarks,
            submitted_at AS submittedAt

         FROM attendance_reports
         WHERE attendance_id = ?`,
        [attendanceId]
    );

    const checkInTimestamp = toTimestamp(record.checkIn);
    const checkOutTimestamp = toTimestamp(record.checkOut);

    const report = reportRows.length
        ? {
            ...reportRows[0],
            submittedAt: toTimestamp(reportRows[0].submittedAt)
        }
        : null;

    // Return the same structure expected by React
    return {
        id: record.id,
        employeeId: record.employeeId,
        employeeCode: record.employeeCode || "",
        employeeName: record.employeeName,
        date: record.date,

        checkIn: checkInTimestamp,
        checkInTime: formatTime(checkInTimestamp),

        checkOut: checkOutTimestamp,
        checkOutTime: formatTime(checkOutTimestamp),

        breaks: breakRows.map((item) => ({
            start: toTimestamp(item.start),
            end: toTimestamp(item.end)
        })),

        report,

        reportSubmitted: Boolean(record.reportSubmitted)
    };
};


// ============================================
// 3. GET EMPLOYEE ATTENDANCE HISTORY
// ============================================

const getAttendanceByEmployee = async (employeeId) => {

    const [rows] = await db.promise().execute(
        `SELECT id
         FROM attendance
         WHERE employee_id = ?
         ORDER BY attendance_date DESC, check_in DESC`,
        [employeeId]
    );

    // Get complete attendance records
    const records = await Promise.all(
        rows.map((row) => getAttendanceById(row.id))
    );

    return records;
};


// ============================================
// 4. CHECK OUT
// ============================================

const checkOut = async (attendanceId, checkOut) => {

    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        // Close any unfinished break
        await connection.execute(
            `UPDATE attendance_breaks
             SET break_end = ?
             WHERE attendance_id = ?
             AND break_end IS NULL`,
            [checkOut, attendanceId]
        );

        // Save employee checkout
        const [result] = await connection.execute(
            `UPDATE attendance
             SET check_out = ?,
                 status = 'checked_out'
             WHERE id = ?
             AND check_out IS NULL`,
            [checkOut, attendanceId]
        );

        if (result.affectedRows === 0) {
            throw new Error(
                "Attendance record not found or already checked out."
            );
        }

        await connection.commit();

        return await getAttendanceById(attendanceId);

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};


// ============================================
// 5. START BREAK
// ============================================

const startBreak = async (attendanceId, breakStart) => {

    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        // Check current attendance status
        const [attendanceRows] = await connection.execute(
            `SELECT id, status, check_out
             FROM attendance
             WHERE id = ?
             FOR UPDATE`,
            [attendanceId]
        );

        if (
            attendanceRows.length === 0 ||
            attendanceRows[0].check_out !== null
        ) {
            throw new Error("Active attendance record not found.");
        }

        if (attendanceRows[0].status !== "working") {
            throw new Error("Employee is not currently working.");
        }

        // Prevent multiple open breaks
        const [openBreaks] = await connection.execute(
            `SELECT id
             FROM attendance_breaks
             WHERE attendance_id = ?
             AND break_end IS NULL`,
            [attendanceId]
        );

        if (openBreaks.length > 0) {
            throw new Error("An active break already exists.");
        }

        // Insert break start time
        await connection.execute(
            `INSERT INTO attendance_breaks
             (attendance_id, break_start)
             VALUES (?, ?)`,
            [attendanceId, breakStart]
        );

        // Update attendance status
        await connection.execute(
            `UPDATE attendance
             SET status = 'on_break'
             WHERE id = ?`,
            [attendanceId]
        );

        await connection.commit();

        return await getAttendanceById(attendanceId);

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};


// ============================================
// 6. END BREAK
// ============================================

const endBreak = async (attendanceId, breakEnd) => {

    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        const [attendanceRows] = await connection.execute(
            `SELECT id, status, check_out
             FROM attendance
             WHERE id = ?
             FOR UPDATE`,
            [attendanceId]
        );

        if (
            attendanceRows.length === 0 ||
            attendanceRows[0].check_out !== null
        ) {
            throw new Error("Active attendance record not found.");
        }

        if (attendanceRows[0].status !== "on_break") {
            throw new Error("Employee is not currently on a break.");
        }

        // Find the currently open break
        const [breakRows] = await connection.execute(
            `SELECT id
             FROM attendance_breaks
             WHERE attendance_id = ?
             AND break_end IS NULL
             ORDER BY break_start DESC
             LIMIT 1
             FOR UPDATE`,
            [attendanceId]
        );

        if (breakRows.length === 0) {
            throw new Error("No active break found.");
        }

        // Save break end time
        await connection.execute(
            `UPDATE attendance_breaks
             SET break_end = ?
             WHERE id = ?`,
            [breakEnd, breakRows[0].id]
        );

        // Return employee to working status
        await connection.execute(
            `UPDATE attendance
             SET status = 'working'
             WHERE id = ?`,
            [attendanceId]
        );

        await connection.commit();

        return await getAttendanceById(attendanceId);

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};


// ============================================
// 7. SUBMIT DAILY WORK REPORT
// ============================================

const submitReport = async (attendanceId, report) => {

    const {
        classesConducted,
        topicsCovered,
        projectsWorked,
        tasksCompleted,
        pendingTasks,
        remarks
    } = report;

    const submittedAt = Date.now();

    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        // Check whether attendance exists and is not checked out
        const [attendanceRows] = await connection.execute(
            `SELECT id, check_out, report_submitted
             FROM attendance
             WHERE id = ?
             FOR UPDATE`,
            [attendanceId]
        );

        if (attendanceRows.length === 0) {
            throw new Error("Attendance record not found.");
        }

        if (attendanceRows[0].check_out !== null) {
            throw new Error("Attendance is already checked out.");
        }

        if (attendanceRows[0].report_submitted) {
            throw new Error("Work report has already been submitted.");
        }

        // Save daily work report
        await connection.execute(
            `INSERT INTO attendance_reports
            (
                attendance_id,
                classes_conducted,
                topics_covered,
                projects_worked,
                tasks_completed,
                pending_tasks,
                remarks,
                submitted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                attendanceId,
                classesConducted,
                topicsCovered,
                projectsWorked,
                tasksCompleted,
                pendingTasks,
                remarks,
                submittedAt
            ]
        );

        // Mark report as submitted
        await connection.execute(
            `UPDATE attendance
             SET report_submitted = TRUE
             WHERE id = ?`,
            [attendanceId]
        );

        await connection.commit();

        return await getAttendanceById(attendanceId);

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
};


// ============================================
// 8. GET ALL ATTENDANCE RECORDS FOR ADMIN
// ============================================

const getAllAttendance = async () => {
    // Get all attendance IDs, newest records first
    const [rows] = await db.promise().execute(
        `SELECT id
         FROM attendance
         ORDER BY attendance_date DESC, check_in DESC`
    );

    // Fetch complete records, including employee details,
    // breaks and submitted work reports
    const records = await Promise.all(
        rows.map((row) => getAttendanceById(row.id))
    );

    return records;
};


// ============================================
// EXPORT ALL MODEL FUNCTIONS
// ============================================

module.exports = {
    checkIn,
    getAttendanceById,
    getAttendanceByEmployee,
    getAllAttendance,
    checkOut,
    startBreak,
    endBreak,
    submitReport
};
