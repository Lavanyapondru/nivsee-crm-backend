
const express = require("express");

const router = express.Router();

const {
    employeeCheckIn,
    getMyAttendance,
    employeeCheckOut,
    employeeStartBreak,
    employeeEndBreak,
    employeeSubmitReport
} = require("../controllers/attendanceController");

const verifyToken = require("../middleware/authMiddleware");

const { verifyEmployee } = require("../middleware/roleMiddleware");

// Protect all attendance routes
router.use(verifyToken, verifyEmployee);

router.post("/check-in", employeeCheckIn);

router.get("/my", getMyAttendance);

router.patch("/:attendanceId/check-out", employeeCheckOut);

router.post("/:attendanceId/break/start", employeeStartBreak);

router.patch("/:attendanceId/break/end", employeeEndBreak);

router.post("/:attendanceId/report", employeeSubmitReport);

module.exports = router;
