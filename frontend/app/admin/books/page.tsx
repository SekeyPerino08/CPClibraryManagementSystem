"use client";
import Sidebar from "@/components/layout/admin/SidebarAdmin";
import Header from "@/components/layout/admin/HeaderAdmin";
import React, { useEffect, useState } from "react";
import IntComSciBook from "@/app/admin/books/images/IntComSciBook.jpg";
import DatabaseManagementBook from "@/app/admin/books/images/DatabaseManagementSystem.png";
import IntroductionToTourismAndHospitalityInBC from "@/app/admin/books/images/IntroductionToTourismAndHospitalityinBC.jpg";
import PrincipleOfTeaching1 from "@/app/admin/books/images/PrincipleOfTeaching1.jpg";
import PrincipleOfTeaching2 from "@/app/admin/books/images/PrincipleOfTeaching2.jpg";
import { Search, PanelRightClose, Plus } from "lucide-react";
import BookCard from "@/components/books/BookCard";
import { toast } from "sonner";
import api from "@/lib/api";
import { ButtonSubmit } from "@/components/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BookCardModal from "@/components/books/BookCardModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface BookType {
  id: number;
  title: string;
  description: string;
  cover_image_url: string;
  author: string;
  course: string;
  available: boolean,
  year: string,
  copies: number
}

const Books = () => {
  const [books, setBooks] = React.useState<BookType[]>([]);
  const [openSideBar, setOpenSideBar] = React.useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);



  // Add book form states
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState(0);
  const [description, setDescription] = useState("");
  const [copies, setCopies] = useState(0);
  const [image, setImage] = useState<File | null>(null);
  const [course, setCourse] = useState("");

  useEffect(() => {
    const getBooks = async () => {
      try {
        const response = await api.get('/api/books');

        setBooks(response.data);
      } catch (error) {
        toast.error("Error in getting books");
        console.log("Error getting books " + error);
        return;
      }
    }

    getBooks();
  }, []);

  const [bookLimitMap, setBookLimitMap] = useState(5);

  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitted(true);
    try {
      const formData = new FormData();
      formData.append("bookTitle", bookTitle);
      formData.append("author", author);
      formData.append("year", String(year));
      formData.append("description", description);
      formData.append("copies", String(copies));
      formData.append("course", course);
      if (image) formData.append("image", image);

      const response = await api.post('/api/books/add', formData, {
        headers: {
          "Content-Type" : "multipart/form-data"
        }
      });

      setSubmitted(false);
      toast.success("Book added successfully!");
      console.log(response.data);

      // Reset form
      setBookTitle("");
      setAuthor("");
      setYear(0);
      setDescription("");
      setCopies(0);
      setImage(null);
      setCourse("");

      // Close modal
      setIsAddModalOpen(false);

      // Refresh books list
      const refreshResponse = await api.get('/api/books');
      setBooks(refreshResponse.data);

    } catch(error) {
      setSubmitted(false);
      console.log("Error submit");
      toast.error("Error adding book");
    }
  }



  return (
    <div className="flex-col md:flex-row flex h-screen overflow-hidden">
      <Header />
      {openSideBar && (
        <Sidebar onClickBtnOpenSideBar={() => setOpenSideBar(!openSideBar)} />
      )}

      <main className="flex-1 flex flex-col p-6 bg-gray-100 overflow-y-auto gap-4">
        <div className="flex justify-center items-center flex-row w-fit gap-3 mb-6">
          {!openSideBar && (
            <PanelRightClose
              className="w-6 h-6 hover:cursor-pointer hidden md:block"
              onClick={() => setOpenSideBar(!openSideBar)}
            />
          )}
          <h1 className="text-2xl font-bold">Browse Book</h1>
        </div>

        {/* SEARCH BOOK */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search Form */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search books..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>

            {/* Course Category Filter */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <label
                htmlFor="course_category"
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                Course Category
              </label>
              <select
                name="course_category"
                id="course_category"
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm min-w-[140px] cursor-pointer hover:bg-gray-100"
              >
                <option value="" className="text-gray-500">
                  All Categories
                </option>
                <option value="BSIT" className="text-gray-900">
                  BSIT
                </option>
                <option value="BSED" className="text-gray-900">
                  BSED
                </option>
                <option value="BEED" className="text-gray-900">
                  BEED
                </option>
                <option value="BSHM" className="text-gray-900">
                  BSHM
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              All Books: {books.length}
            </h2>
            <div className="flex gap-2">
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Book
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Book</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleAddBookSubmit}>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-3 md:gap-6">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="input_bookTitle">Book Title</Label>
                      <Input
                        id="input_bookTitle"
                        type="text"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        required />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="input_bookAuthor">Author</Label>
                      <Input
                        id="input_bookAuthor"
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        required />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="input_bookYear">Year</Label>
                      <Input
                        id="input_bookYear"
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        required />
                    </div>

                    <div className="flex flex-col md:col-span-3 gap-2">
                      <Label htmlFor="input_bookDesc">Description</Label>
                      <Input
                        id="input_bookDesc"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="picture">Book Photo</Label>
                      <Input
                        id="picture"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImage(((e.target) as HTMLInputElement).files?.[0] || null)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="copies">Copies</Label>
                      <Input
                        id="copies"
                        type="number"
                        value={copies}
                        onChange={(e) => setCopies(Number(e.target.value))}
                        required />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="course">Course</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        required
                      >
                        <option value="">Select Course</option>
                        <option value="BSIT">BSIT</option>
                        <option value="BSED">BSED</option>
                        <option value="BEED">BEED</option>
                        <option value="BSHM">BSHM</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitted}
                      className="bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      {submitted ? "Adding Book..." : "Add Book"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div>
            <div className="w-full">
              <div className="hidden md:block">
                <div className="grid grid-cols-6 gap-4 p-2 border-b font-semibold text-sm text-gray-600">
                  <div>Book</div>
                  <div>Book Title</div>
                  <div>Author</div>
                  <div>Category</div>
                  <div>Release Year</div>
                  <div>Status</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
                {books.slice(0, bookLimitMap).map((book) => (
                  <Dialog key={book.id}>
                    <DialogTrigger>
                      <div>
                        <BookCard
                          key={book.id}
                          bookId={book.id}
                          bookTitle={book.title}
                          bookImages={book.cover_image_url}
                          bookAuthor={book.author}
                          bookYear={book.year}
                          bookStatus={book.available}
                          bookCourse={book.course}
                          bookDescription={book.description}
                          bookCopies={book.copies}
                        />
                      </div>
                    </DialogTrigger>

                    <BookCardModal 
                      book_title={book.title}
                      book_cover_url={book.cover_image_url}
                      author={book.author} 
                      year={book.year}
                      description={book.description}
                      copies={book.copies}
                      user="admin"
                    />
                  </Dialog>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Books;


