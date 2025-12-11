import express from 'express';
import { finalRegisterAdminController, loginAdminController, registerAdminRequestController, verifyAdminOtpController, fetchAdmins, forgotPasswordAdminController, resetPasswordAdminController, logoutAdmin, getAdminRole, changeStatus, deleteStudent, getDeletedStudents, restoreStudent, setStudentBorrowedStatus, extendDueDate, issueWalkInBorrow } from '../controllers/admins/authAdminsController.js';
import { jwtAuthenticate, verifyAdminToken, refreshToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/admins', jwtAuthenticate, fetchAdmins);
// router.post('/admins/register', registerAdminsController);
router.post('/admins/login', loginAdminController);
router.post('/admins/register/request', registerAdminRequestController);
router.post('/admins/register/verify-otp', verifyAdminOtpController);
router.post('/admins/register/final-register', finalRegisterAdminController);
router.post('/admins/forgot-password', forgotPasswordAdminController);
router.post('/admins/reset-password', resetPasswordAdminController);
router.post('/admins/change-status', jwtAuthenticate, changeStatus);
router.post('/admins/delete-student', jwtAuthenticate, deleteStudent);
router.post('/admins/restore-student',jwtAuthenticate, restoreStudent);
router.post('/admins/set-student-borrowed-status', setStudentBorrowedStatus);
router.post('/admins/extend-duedate', extendDueDate);
router.post('/admins/issue-walkin-borrow', jwtAuthenticate, issueWalkInBorrow);

router.get('/admins/verify-admin', verifyAdminToken);
router.get('/admins/logout', logoutAdmin);
router.get('/admins/get-info', getAdminRole);
router.get('/admins/get-deleted-students', jwtAuthenticate, getDeletedStudents)

export default router;
