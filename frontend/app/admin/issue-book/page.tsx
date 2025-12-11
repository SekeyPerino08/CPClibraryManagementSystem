"use client";
import Sidebar from "@/components/layout/admin/SidebarAdmin";
import Header from "@/components/layout/admin/HeaderAdmin";
import React, { useEffect, useState } from "react";
import { Search, PanelRightClose, Plus, User, Phone, BookOpen, Calendar, CheckCircle, AlertCircle, Book } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
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

const IssueBook = () => {
  const [books, setBooks] = React.useState<BookType[]>([]);
  const [openSideBar, setOpenSideBar] = React.useState(true);
  const [walkInSubmitted, setWalkInSubmitted] = useState(false);

  // Walk-in borrow form states
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerContact, setBorrowerContact] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [dueDate, setDueDate] = useState("");

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

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setWalkInSubmitted(true);
    try {
      const response = await api.post('/api/admins/issue-walkin-borrow', {
        borrowerName,
        borrowerContact,
        bookId: selectedBookId,
        dueDate
      });

      setWalkInSubmitted(false);
      toast.success("Book issued to walk-in borrower successfully!");
      console.log(response.data);

      // Reset form
      setBorrowerName("");
      setBorrowerContact("");
      setSelectedBookId("");
      setDueDate("");

    } catch(error: any) {
      setWalkInSubmitted(false);
      console.log("Error issuing book to walk-in borrower:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Error issuing book to walk-in borrower");
    }
  };

  return (
    <div className="flex-col md:flex-row flex h-screen overflow-hidden">
      <Header />
      {openSideBar && (
        <Sidebar onClickBtnOpenSideBar={() => setOpenSideBar(!openSideBar)} />
      )}

      <main className="flex-1 flex flex-col p-6 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-y-auto gap-6">
        <div className="flex justify-center items-center flex-row w-fit gap-3 mb-6">
          {!openSideBar && (
            <PanelRightClose
              className="w-6 h-6 hover:cursor-pointer hidden md:block"
              onClick={() => setOpenSideBar(!openSideBar)}
            />
          )}
          <h1 className="text-2xl font-bold">Issue Book to Walk-in Borrower</h1>
        </div>

        <div className="bg-white p-6 rounded-lg shadow flex-1 flex flex-col">
          <h1 className="text-md text-gray-700 font-bold my-3">Issue Book</h1>

          <div className="flex-1">
            <form className="space-y-6" onSubmit={handleWalkInSubmit}>
              <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                {/* Borrower Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Borrower Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="borrowerName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name
                      </Label>
                      <Input
                        id="borrowerName"
                        type="text"
                        placeholder="Enter borrower's full name"
                        value={borrowerName}
                        onChange={(e) => setBorrowerName(e.target.value)}
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="borrowerContact" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Contact Information
                      </Label>
                      <Input
                        id="borrowerContact"
                        type="text"
                        placeholder="Phone number or email"
                        value={borrowerContact}
                        onChange={(e) => setBorrowerContact(e.target.value)}
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Book Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Book Details</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="bookSelect" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Book className="w-4 h-4" />
                        Select Book
                      </Label>
                      <select
                        id="bookSelect"
                        className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedBookId}
                        onChange={(e) => setSelectedBookId(e.target.value)}
                        required
                      >
                        <option value="">Choose a book from the catalog</option>
                        {books.map((book) => (
                          <option key={book.id} value={book.id}>
                            {book.title} - {book.author} ({book.course})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Due Date
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>Please ensure all information is correct before issuing the book</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={walkInSubmitted}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                  >
                    {walkInSubmitted ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Issuing Book...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Issue Book
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Quick Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Book className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Books</p>
                    <p className="text-xl font-bold text-gray-800">{books.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Available Books</p>
                    <p className="text-xl font-bold text-gray-800">{books.filter(book => book.available).length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Today's Date</p>
                    <p className="text-lg font-bold text-gray-800">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IssueBook;
