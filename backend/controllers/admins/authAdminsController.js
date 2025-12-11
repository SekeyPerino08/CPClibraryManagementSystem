import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  findAdminsByEmail,
  findStudentsByEmail,
  findAdminsById,
  findStudentsBySchoolId,
} from "../../models/authModel.js";
import { getAllAdmins } from "../../models/adminsModel.js";
import nodemailer from "nodemailer";
import { generateOTP } from "../../utils/otpGenerator.js";
import { pool } from "../../db.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { findBookById } from "../../models/authModel.js";

export const fetchAdmins = async (req, res) => {
  try {
    const admins = await getAllAdmins();

    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: "FetchAdmins Error" });
  }
};

export const loginAdminController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await findAdminsByEmail(email);
    if (!admin)
      return res.status(401).json({
        message: "Invalid email",
        success: false,
      });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({
        message: "Invalid password",
        success: false,
      });

    const accessToken = generateAccessToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    const refreshToken = generateRefreshToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "development", // Only send over HTTPS in production
      secure: false,
      sameSite: "Lax",
      maxAge: 5 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login Successfully",
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login error",
      error: error.message,
      success: false,
    });
  }
};

export const registerAdminRequestController = async (req, res) => {
  const { email } = req.body;

  try {
    const existingAdmin = await findAdminsByEmail(email);

    if (existingAdmin) {
      return res.status(409).json({
        message: "Email already exists. Please use another email.",
      });
    }

    const otp = generateOTP();

    await pool.query(
      `
      INSERT INTO admin_otps (email, otp, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
      ON CONFLICT (email)
      DO UPDATE SET otp = $2, expires_at = NOW() + INTERVAL '5 minutes'
      `,
      [email, otp]
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Registration OTP",
      text: `Your OTP for registration is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      message: "OTP sent to your email",
      success: true,
      otp,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to request register",
      success: false,
      error: error.message,
    });
  }
};

export const verifyAdminOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await pool.query(
      `
      SELECT * FROM admin_otps WHERE email = $1 AND otp = $2
    `,
      [email, otp]
    );

    const otpRecord = result.rows[0];

    if (!otpRecord) {
      return res.status(404).json({
        message: "No OTP request found",
      });
    }

    if (otpRecord.expires_at < new Date()) {
      return res.status(400).json({
        message: "OTP expires. Please request a new one",
      });
    }

    return res.json({
      message: "OTP verified",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

export const finalRegisterAdminController = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingAdmin = await findAdminsByEmail(email);
    if (existingAdmin) {
      return res.status(409).json({
        message: "Email already registered as admin.",
      });
    }

    const otpRecord = await pool.query(
      `
      SELECT * FROM admin_otps WHERE email = $1
    `,
      [email]
    );

    if (otpRecord.rows.length === 0) {
      return res.status(400).json({
        message:
          "Email is not verified. Please complete OTP verification first",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await pool.query(
      `
        INSERT INTO admins (name, email, password)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
      [name, email, hashedPassword]
    );

    await pool.query(`DELETE FROM admin_otps WHERE email = $1`, [email]);

    res.status(201).json({
      message: "Admin registered successfully",
      admin: newAdmin.rows[0],
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to register admin",
      error: error.message,
    });
  }
};

export const forgotPasswordAdminController = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await findAdminsByEmail(email);
    if (!user) return res.status(404).json({ message: "Email not found" });

    const OTP = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query(
      `
      INSERT INTO admin_otps (email, otp, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
      ON CONFLICT (email)
      DO UPDATE SET otp = $2, expires_at = NOW() + INTERVAL '5 minutes'
      `,
      [email, OTP]
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${OTP}`,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: "OTP sent to your email",
      otp: OTP,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error in forgot password",
      error: error.message,
      success: false,
    });
  }
};

export const resetPasswordAdminController = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const user = await findAdminsByEmail(email);
    if (!user) return res.status(404).json({ message: "Email not found" });

    const otpRecord = await pool.query(
      `
      SELECT * FROM admin_otps WHERE email = $1
    `,
      [email]
    );

    if (otpRecord.rows.length === 0) {
      return res.status(400).json({
        message:
          "Email is not verified. Please complete OTP verification first",
      });
    }

    if (otpRecord.rows[0].otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE admins
      SET password = $1
      WHERE email = $2
      `,
      [hashedPassword, email]
    );

    await pool.query(
      `
        DELETE FROM admin_otps
        WHERE email = $1
      `,
      [email]
    );

    return res.json({
      message: "Password reset successful",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error in reset password",
      error: error.message,
      success: false,
    });
  }
};

export const logoutAdmin = async (req, res) => {
  try {
    res.cookie("access_token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 0,
      path: "/",
    });

    res.cookie("refresh_token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 0,
      path: "/",
    });

    res.status(200).json({
      message: "Logged out successfully!",
      success: true,
      role: "admin",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Logout failed",
      error: error.message,
      success: false,
    });
  }
};

export const getAdminRole = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      message: "User not found",
      success: false,
    });
  }

  try {
    const admin = await findAdminsById(user.id);
    if (!admin) {
      return res.status(401).json({
        message: "Admin based on Id not found",
        success: false,
      });
    }

    res.status(200).json({
      message: "Admin has been found",
      success: true,
      admin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to get admin role",
      success: false,
    });
  }
};

export const changeStatus = async (req, res) => {
  try {
    const { status, email } = req.body;
    const student = findStudentsByEmail(email);

    await pool.query(
      `
          UPDATE students
          SET status = $1
          WHERE email = $2;
        `,
      [status, email]
    );

    res.json({
      message: `Successfully changed ${student.name}'s status to ${status}`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error in changing status",
      success: false,
    });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { email, reason } = req.body;
    const student = await findStudentsByEmail(email);

    await pool.query('BEGIN');

    await pool.query(
      `
      INSERT INTO deleted_students 
        (name, email, student_id, course, section, status, password, role, profile_url, profile_public_id, delete_reason) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11)
    `,
      [
        student.name,
        student.email,
        student.student_id,
        student.course,
        student.section,
        student.status,
        student.password,
        student.role,
        student.profile_url,
        student.profile_public_id,
        reason
      ]
    );

    await pool.query(
      `
        DELETE FROM students WHERE email = $1;
      `,
      [email]
    );

    await pool.query("COMMIT");

    res.json({
      message: `Student ${student.name} has been deleted successfully.`,
    });
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error deleting student",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

export const restoreStudent = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, reason } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const { rows } = await client.query(
      'SELECT * FROM deleted_students WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Student not found in deleted records" });
    }

    const student = rows[0];

    await client.query('BEGIN');

    await client.query(`
      INSERT INTO students 
        (name, email, student_id, course, section, status, password, role, profile_url, profile_public_id, restore_reason)
      VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10)
      ON CONFLICT (email) DO UPDATE
        SET status = 'active',
            restore_reason = EXCLUDED.restore_reason
      RETURNING *
    `, [
      student.name,
      student.email,
      student.student_id,
      student.course || 'not set',
      student.section || 'not set',
      student.password,
      student.role || 'student',
      student.profile_url,
      student.profile_public_id,
      reason || 'restored'
    ]);

    await client.query('DELETE FROM deleted_students WHERE email = $1', [email]);

    await client.query('COMMIT');

    res.status(200).json({
      message: `Student ${student.name} has been restored successfully.`,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Restore student error:', error);
    res.status(500).json({
      message: "Restoring student failed",
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const getDeletedStudents = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM deleted_students
    `);

    res.json({
      students: result.rows,
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error,
    })
  }
}

export const setStudentBorrowedStatus = async (req, res) => {
  try {
    const { borrowedStatus, borrowId } = req.body;

    const query = `
      UPDATE borrow_records
      SET status = $1
      WHERE id = $2
    `;

    await pool.query(query, [borrowedStatus, borrowId]);

    res.json({
      message: "Set status to " + borrowedStatus + " successfully",
      success: true,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error setting student borrowed status",
      error: error,
    })
  }
}

export const extendDueDate = async (req, res) => {
  try {
    const { borrowId, extendDueDateValue } = req.body;

    await pool.query(`
      UPDATE borrow_records
      SET due_date = $1
      WHERE id = $2;
    `, [extendDueDateValue, borrowId]);

    res.json({
      message: "Extend due date successfully",
      success: true,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
    })
  }
}

export const issueWalkInBorrow = async (req, res) => {
  try {
    const { borrowerName, borrowerContact, bookId, dueDate } = req.body;

    if (!borrowerName || !borrowerContact || !bookId || !dueDate) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    const book = await findBookById(bookId);
    if (!book) {
      return res.status(404).json({
        message: "Book not found.",
        success: false,
      });
    }

    if (book.copies <= 0) {
      return res.status(400).json({
        message: "No copies available",
        success: false,
      });
    }

    // Create a temporary student record for walk-in borrower
    const tempStudentId = "WALKIN-" + Date.now().toString().slice(-8);
    const tempStudentResult = await pool.query(
      `
        INSERT INTO students (name, email, student_id, password, role, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [borrowerName, `${tempStudentId}@walkin.local`, tempStudentId, 'temp_password', 'walkin', 'active']
    );

    const studentId = tempStudentResult.rows[0].id;

    const borrowCode = "WALKIN-" + Date.now().toString().slice(-6);
    const qrData = JSON.stringify({
      type: "walkin",
      borrowerName,
      borrowerContact,
      bookTitle: book.title,
      borrowCode,
      dueDate,
      issuedDate: new Date().toISOString()
    });

    const record = await pool.query(
      `
        INSERT INTO borrow_records (student_id, book_id, due_date, borrow_code, qr_code, status)
        VALUES ($1, $2, $3, $4, $5, 'borrowed')
        RETURNING *
      `, [studentId, bookId, dueDate, borrowCode, qrData]
    );

    await pool.query(
      "UPDATE books SET copies = copies - 1 WHERE id = $1", [bookId]
    );

    res.status(201).json({
      message: "Book issued to walk-in borrower successfully!",
      success: true,
      record: record.rows[0],
      receipt: {
        borrow_code: borrowCode,
        borrower_name: borrowerName,
        borrower_contact: borrowerContact,
        book_title: book.title,
        due_date: dueDate,
        issued_date: record.rows[0].borrow_date,
      }
    });

  } catch (error) {
    console.log("Issue walk-in borrow error:", error);
    return res.status(500).json({
      message: "Failed to issue book to walk-in borrower",
      success: false,
      error: error.message,
    });
  }
}
