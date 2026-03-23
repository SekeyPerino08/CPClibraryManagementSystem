import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findStudentsBySchoolId, findStudentsByEmail } from "../../models/authModel.js";
import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import { generateOTP } from "../../utils/otpGenerator.js";
import { pool } from "../../db.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { relations } from "drizzle-orm";
import { getAllStudents } from "../../models/studentsModel.js";
// import { cloudinary, uploadProfile } from "../../utils/cloudinary.js";

export const fetchStudents = async (req, res) => {
  try {
    const user = req.user; 

    console.log("Authenticated user:", user.id);
    const students = await getAllStudents();

    res.json(students);
  } catch (error) {
    res.status(500).json({error: "FetchStudents Error"});
    console.error("FetchStudents Error:", error.message);
  }
};

export const loginStudentController = async (req, res) => {
  try {
    const {schoolId, password} = req.body;

    const user = await findStudentsBySchoolId(schoolId);
    if (!user) return res.status(401).json({message: "Invalid schoolId", success: false});

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({message: "Invalid password", success: false});

    const accessToken = generateAccessToken({
      id: user.id, 
      email: user.email, 
      schoolId: user.student_id, 
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      schoolId: user.student_id,
      role: user.role,
    })

     res.cookie('access_token', accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    // res.setHeader('Authorization', `Bearer ${token}`);  
    
    res.json({
      message: "Login Successfully",
      success: true,
      student: {
        id: user.id,
        name: user.name,
        schoolId: user.student_id,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    res.status(500).json({message: "Login error", error: error.message});
  }
}

export const registerStudentRequestController = async (req, res) => {
  const {name, schoolId, email, password, course} = req.body;

  try {
    const existingStudentByEmail = await findStudentsByEmail(email);
    if (existingStudentByEmail) {
      return res.status(409).json({
        message: "Email already exist. Please use another email",
        success: false
      });
    }

    const existingStudentBySchoolId = await findStudentsBySchoolId(schoolId);
    if (existingStudentBySchoolId) {
      return res.status(409).json({
        message: "This school ID is already registered",
        success: false
      });
    };

    const otp = generateOTP();

    await pool.query(
      `
        INSERT INTO student_otps (email, otp, expires_at, student_id)
        VALUES ($1, $2, NOW() + INTERVAL '5 minutes', $3)
        ON CONFLICT (email)
        DO UPDATE SET 
          otp = $2, 
          expires_at = NOW() + INTERVAL '5 minutes',
          student_id = $3
      `,
      [email, otp, schoolId]
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
      text: `Your OTP for registration is ${otp}`
    }

    await transporter.sendMail(mailOptions);

    return res.json({
      message: "OTP sent to you email", 
      otp,
      success: true
    });


  } catch (error) {
    return res.status(500).json({
      message: "Failed to request register",
      success: false,
      error: error.message
    })
  }
}

export const verifyStudentOtpController = async (req, res) => {
  try {
    const { email, schoolId ,otp } = req.body;

    const result = await pool.query(
      `
        SELECT * FROM student_otps
        WHERE email = $1
          AND otp = $2
          AND student_id = $3
      `, [email, otp, schoolId]
    );

    const otpRecord = result.rows[0];
    if (!otpRecord) {
      return res.status(404).json({
        message: "No OTP request found or Invalid OTP",
        success: false
      });
    };

    if (otpRecord.expires_at < new Date()) {
      return res.status(400).json({
        message: "Otp expires. Please request a new one",
        success: false
      });
    };

    return res.status(200).json({
      message: "OTP verified",
      success: true
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to verify student OTP",
      error: error.message,
      success: false
    })
  }
}

export const finalRegisterStudentController = async (req, res) => {
  const {name, email, schoolId, password, course} = req.body;

  try {
    const existingStudentByEmail = await findStudentsByEmail(email);
    if (existingStudentByEmail) {
      return res.status(409).json({
        message: "Email already registered as student",
        success: false
      })
    }

    const existingStudentBySchoolId = await findStudentsBySchoolId(schoolId);
    if (existingStudentBySchoolId) {
      return res.status(409).json({
        message: "School Id already registered as student",
        success: false
      });
    };

    const otpRecord = await pool.query(
      `
        SELECT * FROM student_otps
        WHERE email = $1
          AND student_id = $2
      `,[email, schoolId]
    );

    if (otpRecord.rows.length === 0) {
      return res.status(400).json({
        message: "Email not verified. Please complete OTP verification first",
        success: false
      });
    };

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = await pool.query(
      `
        INSERT INTO students (name, email, student_id, password, course)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name, email, schoolId, hashedPassword, course]
    );

    await pool.query(
      `
        DELETE FROM student_otps 
        WHERE email = $1 AND student_id = $2
      `, [email, schoolId]
    );

    res.status(201).json({
      message: "Student registered successfully",
      success: true,
      student: newStudent.rows[0],
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to register student",
      error: error.message,
      success: false
    })
  }
}

export const forgotPasswordStudentsController = async (req, res) => {
  try {
     const {email} = req.body;

    const user = await findStudentsByEmail(email);
    if (!user) return res.status(404).json({
      message: "Email not found",
      success: false
    });

    const OTP = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query(
      `
      INSERT INTO student_otps (email, otp, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
      ON CONFLICT (email)
      DO UPDATE SET otp = $2, expires_at = NOW() + INTERVAL '5 minutes'
      `,
      [email, OTP]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${OTP}`,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: "OTP sent to email", 
      otp: OTP,
      success: true,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error in forgot password", 
      error: error.message,
      success: false
    });
  }
}

export const resetPasswordStudentsController = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const user = await findStudentsByEmail(email);
    if (!user) return res.status(404).json({message: "Email not found"});

    const otpRecord = await pool.query(
      `
      SELECT * FROM student_otps WHERE email = $1
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
      return res.status(400).json({message: "Invalid OTP"});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE students
      SET password = $1
      WHERE email = $2
      `,
      [hashedPassword, email]
    );

    await pool.query(
      `
        DELETE FROM student_otps
        WHERE email = $1
      `, [email]
    );

    return res.json({
      message: "Password reset successful", 
      success: true
    });
    
  } catch (error) {
    return res.status(500).json({
      message: "Error in reset password", 
      error: error.message,
      success: false
    });
  }
}

export const logoutStudent = async (req, res) => {
  try {
    res.cookie("access_token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    res.cookie("refresh_token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    res.status(200).json({
      message: "Logged out successfully!",
      success: true,
      role: "student",
    });

  } catch (error) {
    return res.status(500).json({
      message: "Logout failed",
      error: error.message,
      success: false
    })
  }
}

export const findStudent = async (req, res) => {
  try {
    const email = req.user.email;
    const student = await findStudentsByEmail(email);

    res.status(200).json({
      student: student,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Finding student failed",
      success: false,
      error: error.message,
    })
  }
}

const DEFAULT_PROFILE_CONFIG = {
  url: 'http://localhost:8080/uploads/defaults/default-profile.jpg',
  public_id: 'default-profile.jpg'
}

const processStockProfile = (req) => {
  if (!req.file) {
    return {
      url: DEFAULT_PROFILE_CONFIG.url,
      public_id: DEFAULT_PROFILE_CONFIG.public_id,
      isDefault: true,
    }
  }

  const filename = req.file.filename;
  const url = `http://localhost:8080/uploads/profiles/${filename}`;
  return {
    url,
    public_id: filename,
    isDefault: false,
  };
};

export const updateProfile = async (req, res) => {
  const studentId = req.user.id;
  const {name, email, course, section} = req.body;
  try {
    const profilePicture = req.file
      ? { url: req.file.path, public_id: req.file.filename }
      : { url: DEFAULT_PROFILE_CONFIG.url, public_id: DEFAULT_PROFILE_CONFIG.public_id };


    const query = `
      UPDATE students
      SET name = $1, 
          email = $2, 
          course = $3, 
          section = $4, 
          profile_url = $6, 
          profile_public_id = $7
      WHERE id = $5
      RETURNING name, email, course, section, id, profile_url, profile_public_id;
    `

    const values = [name, email, course, section, studentId, profilePicture.url, profilePicture.public_id];
    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      student: result.rows[0],
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error in updatin profile",
      success: false,
    })
  }
}