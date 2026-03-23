import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import studentsRoutes from './routes/studentsRoutes.js';
import adminsRoutes from './routes/adminsRoutes.js'
import booksRoutes from './routes/booksRoutes.js'
import authRoutes from './routes/authRoutes.js'
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

app.get('/', (req, res) => {
  res.send("hi");
})

app.use('/api', studentsRoutes);
app.use('/api', adminsRoutes);
app.use('/api', booksRoutes);
app.use('/api', authRoutes);

export default app;
