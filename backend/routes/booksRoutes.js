import express from 'express';
import { addBook, borrowBook, fetchBooks, getAllBorrowed, getMyBorrowed, scanBorrowQr } from '../controllers/books/authBooksController.js';
import { jwtAuthenticate } from '../middleware/authMiddleware.js';
import { uploadBook } from '../utils/local_storage.js';

const router = express.Router();

router.get('/books',jwtAuthenticate, fetchBooks);
router.get('/borrowed',jwtAuthenticate, getAllBorrowed);
router.get('/books/my-borrowed', jwtAuthenticate, getMyBorrowed);

router.post('/books/add', uploadBook.single("image"), addBook);
router.post('/books/borrow', borrowBook);
router.post('/books/scan-borrow-qr', scanBorrowQr)

export default router;