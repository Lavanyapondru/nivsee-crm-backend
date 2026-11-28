const express = require("express");
const router = express.Router();

const {
  getAllAttendanceForAdmin,
  getEmployeeAttendanceForAdmin,
} = require("../controllers/attendanceController");

const verifyToken = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/roleMiddleware");

router.use(verifyToken, verifyAdmin);

router.get("/", getAllAttendanceForAdmin);

router.get("/employee/:employeeId", getEmployeeAttendanceForAdmin);

module.exports = router;