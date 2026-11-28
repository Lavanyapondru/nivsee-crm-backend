
const attendanceModel = require("../models/attendanceModel");

// ============================================
// ATTENDANCE CONTROLLER
// Handles attendance requests and responses
// ============================================


// ============================================
// HELPER: VERIFY EMPLOYEE OWNERSHIP
// ============================================

const getOwnedAttendance = async (attendanceId, employeeId) => {

    const attendance = await attendanceModel.getAttendanceById(
        attendanceId
    );

    if (!attendance) {
        const error = new Error("Attendance record not found.");
        error.statusCode = 404;
        throw error;
    }

    // Make sure the attendance belongs to logged-in employee
    if (String(attendance.employeeId) !== String(employeeId)) {
        const error = new Error(
            "You are not authorized to access this attendance record."
        );
        error.statusCode = 403;
        throw error;
    }

    return attendance;
};


// ============================================
// 1. EMPLOYEE CHECK-IN
// ============================================

const employeeCheckIn = async (req, res, next) => {
    try {

        // Employee ID comes from verified JWT
        const employeeId = req.user.id;

        // Get attendance date from frontend
        const { date } = req.body;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                message: "A valid attendance date is required."
            });
        }

        // Generate timestamp on backend
        const checkIn = Date.now();

        const attendance = await attendanceModel.checkIn({
            employeeId,
            date,
            checkIn
        });

        // Fetch complete record in the existing React format
        const completeRecord = await attendanceModel.getAttendanceById(
            attendance.id
        );

        return res.status(201).json({
            message: "Employee checked in successfully.",
            attendance: completeRecord
        });

    } catch (error) {
        next(error);
    }
};


// ============================================
// 2. GET EMPLOYEE ATTENDANCE HISTORY
// ============================================

const getMyAttendance = async (req, res, next) => {
    try {

        const employeeId = req.user.id;

        const attendance =
            await attendanceModel.getAttendanceByEmployee(employeeId);

        return res.status(200).json({
            message: "Attendance records fetched successfully.",
            attendance
        });

    } catch (error) {
        next(error);
    }
};


// ============================================
// 3. EMPLOYEE CHECK-OUT
// ============================================

const employeeCheckOut = async (req, res, next) => {
    try {

        const employeeId = req.user.id;
        const { attendanceId } = req.params;

        // Verify ownership before updating
        await getOwnedAttendance(attendanceId, employeeId);

        const checkOut = Date.now();

        const attendance = await attendanceModel.checkOut(
            attendanceId,
            checkOut
        );

        return res.status(200).json({
            message: "Employee checked out successfully.",
            attendance
        });

    } catch (error) {
        next(error);
    }
};


// ============================================
// 4. EMPLOYEE START BREAK
// ============================================

const employeeStartBreak = async (req, res, next) => {
    try {

        const employeeId = req.user.id;
        const { attendanceId } = req.params;

        // Verify attendance belongs to logged-in employee
        await getOwnedAttendance(attendanceId, employeeId);

        const breakStart = Date.now();

        const attendance = await attendanceModel.startBreak(
            attendanceId,
            breakStart
        );

        return res.status(200).json({
            message: "Break started successfully.",
            attendance
        });

    } catch (error) {
        next(error);
    }
};


// ============================================
// 5. EMPLOYEE END BREAK
// ============================================

const employeeEndBreak = async (req, res, next) => {
    try {

        const employeeId = req.user.id;
        const { attendanceId } = req.params;

        // Verify attendance ownership
        await getOwnedAttendance(attendanceId, employeeId);

        const breakEnd = Date.now();

        const attendance = await attendanceModel.endBreak(
            attendanceId,
            breakEnd
        );

        return res.status(200).json({
            message: "Break ended successfully.",
            attendance
        });

    } catch (error) {
        next(error);
    }
};


// ============================================
// 6. SUBMIT DAILY WORK REPORT
// ============================================

const employeeSubmitReport = async (req, res, next) => {
    try {

        const employeeId = req.user.id;
        const { attendanceId } = req.params;

        const {
            classesConducted,
            topicsCovered,
            projectsWorked,
            tasksCompleted,
            pendingTasks,
            remarks
        } = req.body;

        // Verify ownership
        await getOwnedAttendance(attendanceId, employeeId);

        // Validate required report fields
        const requiredFields = {
            classesConducted,
            topicsCovered,
            projectsWorked,
            tasksCompleted,
            pendingTasks,
            remarks
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([key, value]) =>
                value === undefined ||
                value === null ||
                String(value).trim() === ""
            )
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: "Please complete all work report fields.",
                missingFields
            });
        }

        const attendance = await attendanceModel.submitReport(
            attendanceId,
            requiredFields
        );

        return res.status(200).json({
            message: "Daily work report submitted successfully.",
            attendance
        });

    } catch (error) {
        next(error);
    }
};


// ============================================
// 7. GET ALL ATTENDANCE RECORDS FOR ADMIN
// ============================================

const getAllAttendanceForAdmin = async (req, res, next) => {
    try {
        const attendance = await attendanceModel.getAllAttendance();

        return res.status(200).json({
            message: "All attendance records fetched successfully.",
            attendance
        });
    } catch (error) {
        next(error);
    }
};

// Get attendance history for one employee (Admin only)
const getEmployeeAttendanceForAdmin = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const attendance = await attendanceModel.getAttendanceByEmployee(
            employeeId
        );

        return res.status(200).json({
            success: true,
            count: attendance.length,
            attendance
        });

    } catch (error) {
        console.error("Admin Employee Attendance Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch employee attendance"
        });
    }
};
// ============================================
// EXPORT CONTROLLER FUNCTIONS
// ============================================

module.exports = {
    employeeCheckIn,
    getMyAttendance,
    employeeCheckOut,
    employeeStartBreak,
    employeeEndBreak,
    employeeSubmitReport,
    getAllAttendanceForAdmin,
    getEmployeeAttendanceForAdmin
};