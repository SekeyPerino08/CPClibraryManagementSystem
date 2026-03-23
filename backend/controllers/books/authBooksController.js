import { getAllBooks } from "../../models/booksModel.js";
import { pool } from "../../db.js";
import { findBookById } from "../../models/authModel.js"
import jwt from "jsonwebtoken";
import QRCode from "qrcode";

const DEFAULT_COVER_CONFIG = {
  url: process.env.STOCK_BOOK_COVER_URL,
  public_id: 'default-book-cover'
}

export const fetchBooks = async (req, res) => {
  try {
    const books = await getAllBooks();

    res.json(books);
  } catch (error) {
    res.status(500).json({error: "FetchBooks error"});
  }
}

const processBookCover = (req) => {
  if (!req.file) {
    return {
      url: DEFAULT_COVER_CONFIG.url,
      public_id: DEFAULT_COVER_CONFIG.public_id,
      isDefault: true,
    };
  };

  const filename = req.file.filename;
  const url = `http://localhost:8080/uploads/books/${filename}`;
  return {
    url,
    public_id: filename,
    isDefault: false,
  };
};

export const addBook = async (req, res) => {
  const {bookTitle, author, year, description, copies, course} = req.body;
  try {
    const cover = processBookCover(req);

    await pool.query(
      `
        INSERT INTO books (title, description, author, copies, "year", cover_image_url, image_public_id, course)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (title)
        DO UPDATE SET
          description = EXCLUDED.description,
          author = EXCLUDED.author,
          copies = EXCLUDED.copies,
          "year" = EXCLUDED."year",
          cover_image_url = EXCLUDED.cover_image_url,
          image_public_id = EXCLUDED.image_public_id;
      `, [bookTitle, description, author, copies, year, cover.url, cover.public_id, course]
    );

    res.status(201).json({
      message: "Book added successfully",
      success: true,
      data: {
        title: bookTitle,
        imageUrl: cover.url,
        imagePublicId: cover.public_id,
        isDefault: cover.isDefault
      }
    });

  } catch (error) {
    console.log("Add book error:" + error);

    return res.status(500).json({
      message: "Add book error",
      success: false,
      error: error.message
    })
  }
}

function generateBorrowCode() {
  return "BRW-" + Date.now().toString().slice(-6);
}

const getSecret = (primary, fallback) => {
  const secret = process.env[primary] || process.env[fallback];
  if (!secret) {
    throw new Error(`Missing JWT secret: set ${primary} or ${fallback}`);
  }
  return secret;
};

const getAccessSecret = () => getSecret("ACCESS_TOKEN", "MY_SECRET_KEY");
const getRefreshSecret = () => getSecret("REFRESH_TOKEN", "MY_REFRESH_TOKEN");

export const borrowBook = async (req, res) => {
  const { book_id } = req.body;
  const access_token = req.cookies.access_token;
  const refresh_token = req.cookies.refresh_token;

  if (!access_token && !refresh_token) {
    return res.status(401).json({
      message: "Unauthorized Access",
    });
  };

  if (!book_id) {
    return res.status(400).json({ message: "Book ID is required", success: false });
  }

  try {
    let studentPrimaryId;
    let decoded;
    if (access_token) {
      decoded = jwt.verify(access_token, getAccessSecret());
      studentPrimaryId = decoded.id;
    } else {
      decoded = jwt.verify(refresh_token, getRefreshSecret());
      studentPrimaryId = decoded.id;
    }

    const studentResult = await pool.query("SELECT * FROM students WHERE id = $1", [studentPrimaryId]);
    const student = studentResult.rows[0];
    if (!student) {
      return res.status(404).json({
        message: "Student not found.",
        success: false,
      });
    }

    const book = await findBookById(book_id);
    if (!book) {
      return res.status(404).json({
        message: "Book not found.",
        success: false,
      })
    }

    const copies = book.copies;
    if (copies <= 0) {
      return res.status(400).json({
        message: "No copies available",
        success: false,
      })
    }

    const borrowCode = generateBorrowCode();
    const due_date = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const qrData = `
      Borrow Code: ${borrowCode}
      Borrow Title: ${book.title}
      Student ID: ${student.student_id}
      Due Date: ${due_date.toLocaleString()}
    `;
    const qrCodeImage = await QRCode.toDataURL(qrData);

    const record = await pool.query(
      `
        INSERT INTO borrow_records (student_id, book_id, due_date, borrow_code, qr_code)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [studentPrimaryId, book_id, due_date, borrowCode, qrCodeImage]
    );

    await pool.query(
      "UPDATE books SET copies = copies - 1 WHERE id = $1", [book_id]
    );

    res.status(201).json({
      message: "Book borrowed successfully!",
      record: record.rows[0],
      success: true,
      receipt: {
        borrow_code: borrowCode,
        student_id: student.student_id,
        student_name: student.name,
        book_id: book.id,
        book_title: book.title,
        borrow_date: record.rows[0].borrow_date,
        due_date: record.rows[0].due_date,
        qr_code: record.rows[0].qr_code,
      }
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Borrow book failed",
      success: false,
      error: error.message,
    })
  }
}

export const getAllBorrowed = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        br.id AS borrow_id,
        br.borrow_code,
        br.borrow_date,
        br.due_date,
        br.return_date,
        br.status,
        s.id AS student_db_id,
        s.student_id AS student_school_id,
        s.name AS student_name,
        b.id AS book_id,
        b.title AS book_title,
        b.author AS book_author
      FROM borrow_records br
      JOIN students s ON br.student_id = s.id
      JOIN books b ON br.book_id = b.id
      ORDER BY br.borrow_date DESC
    `);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.log("Get all borrowed error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch borrowed books",
      error: error.message
    });
  }
};

export const getMyBorrowed = async (req, res) => {
  try {
    const studentPrimaryId = req.user.id;

    const query = `
      SELECT br.*, b.title AS book_title
      FROM borrow_records br
      JOIN books b ON b.id = br.book_id
      WHERE br.student_id = $1
      ORDER BY br.borrow_date DESC
    `;

    const result = await pool.query(query, [studentPrimaryId]);
    const formatted = result.rows.map((row) => ({
      bookTitle: row.book_title,
      borrowDate: row.borrow_date,
      dueDate: row.due_date,
      status: row.status
    }));
    
    res.json({
      success: true,
      borrowed: result.rows,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Getting borrowed books failed",
      success: false,
    })
  }
}

export const scanBorrowQr = async (req, res) => {
  try {
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({
        message: "Qr data is missing",
        success: false,
      })
    }

    const borrowCodeMatch = qr_data.match(/borrow\s*code\s*:\s*(.+)/i);
    const borrowCode = borrowCodeMatch ? borrowCodeMatch[1].trim() : null;

    if (!borrowCode) {
      return res.status(400).json({
        message: "Invalid QR content",
        success: false,
      });
    };

    const record = await pool.query(`
      UPDATE borrow_records
      SET status = 'borrowed'
      WHERE borrow_code = $1
    `, [borrowCode]);

    res.json({
      message: "Qr Verified! Status changed to borrowed",
      success: true
    })

  } catch (error) {
    return res.status(500).json({
      message: "Qr scan failed",
      success: false,
      error: error.message
    })
  }
}