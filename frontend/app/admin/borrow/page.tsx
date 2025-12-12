"use client";

import React, { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/layout/admin/SidebarAdmin";
import Header from "@/components/layout/admin/HeaderAdmin";
import { ChevronRight, ScanQrCode, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import BorrowMoreModal from "@/components/borrow/BorrowMoreModal";
import ScanBorrowQr, {ScanBorrowQrHandles} from "@/components/ScanBorrowQr";

interface BorrowedHistory {
  borrow_id: number;
  borrow_code: string;
  borrow_date: string;
  due_date: string;
  status: string;
  student_name: string;
  student_school_id: string;
  book_title: string;
  book_author: string;
  penalty?: number;
  qr_code: string;
}

export default function BorrowBookPage() {
  const [openSideBar, setOpenSideBar] = useState(true);
  const [borrowedHistory, setBorrowedHistory] = useState<BorrowedHistory[]>([]);
  const [extendSubmitted, setExtendSubmitted] = useState(false);
  const [borrowedSubmitted, setBorrowedSubmitted] = useState(false);
  const [returnedSubmitted, setReturnedSubmitted] = useState(false);
  const [overdueSubmitted, setOverdueSubmitted] = useState(false);
  const [missingSubmitted, setMissingSubmitted] = useState(false);
  const [extendDueDateValue, setExtendDueDateValue] = useState("");

  const scannerRef = useRef<ScanBorrowQrHandles>(null);



  // Fetch borrowed history
  useEffect(() => {
    const getBorrowed = async () => {
      try {
        const response = await api.get("/api/borrowed");
        const data: BorrowedHistory[] = response.data.data;

        const updatedData = data.map((record) => {
          const dueDate = new Date(record.due_date);
          const today = new Date();
          const diffTime = today.getTime() - dueDate.getTime();
          const overdueDays = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
          const penalty = overdueDays * 30;
          return { ...record, penalty };
        });

        setBorrowedHistory(updatedData);
      } catch (error) {
        toast.error("Error in getting all borrowed history");
        console.log(error);
      }
    };

    getBorrowed();
  }, []);

  const setStudentBorrowedStatus = async (borrowId: number, borrowedStatus: string) => {
    if (borrowedStatus === "borrowed") setBorrowedSubmitted(true);
    if (borrowedStatus === "returned") setReturnedSubmitted(true);
    if (borrowedStatus === "overdue") setOverdueSubmitted(true);
    if (borrowedStatus === "missing") setMissingSubmitted(true);

    try {
      await api.post("/api/admins/set-student-borrowed-status", { borrowedStatus, borrowId });
      toast.success(`Borrow status set to ${borrowedStatus} successfully!`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      if (borrowedStatus === "borrowed") setBorrowedSubmitted(false);
      if (borrowedStatus === "returned") setReturnedSubmitted(false);
      if (borrowedStatus === "overdue") setOverdueSubmitted(false);
      if (borrowedStatus === "missing") setMissingSubmitted(false);

      toast.error("Error in setting book status");
      console.log(error);
    }
  };

  const extendDueDate = async (borrowId: number) => {
    if (!extendDueDateValue) {
      toast.error("Please select a new due date");
      return;
    }
    setExtendSubmitted(true);
    try {
      const result = await api.post("/api/admins/extend-duedate", {
        borrowId,
        extendDueDateValue,
      });
      toast.success(result.data.message);

      setBorrowedHistory((prev) =>
        prev.map((record) =>
          record.borrow_id === borrowId
            ? { ...record, due_date: extendDueDateValue }
            : record
        )
      );
      setExtendDueDateValue("");
      setExtendSubmitted(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      setExtendSubmitted(false);
      toast.error("Extending due date failed");
      console.log(error);
    }
  };



  return (
    <div className="flex-col md:flex-row flex h-screen overflow-hidden">
      <Header />
      {openSideBar && (
        <Sidebar onClickBtnOpenSideBar={() => setOpenSideBar(!openSideBar)} />
      )}

      <main className="flex-1 flex flex-col p-6 bg-gray-100 overflow-y-auto gap-4">
        <div className="flex justify-center items-center flex-row w-fit gap-3 mb-6">
          {!openSideBar && (
            <ChevronRight
              className="w-6 h-6 hover:cursor-pointer hidden md:block"
              onClick={() => setOpenSideBar(!openSideBar)}
            />
          )}
          <h1 className="text-2xl font-bold">Borrow Records</h1>
        </div>

        <div className="bg-white p-6 rounded-lg shadow flex-1 flex flex-col">
          <h1 className="text-md text-gray-700 font-bold my-3">Recent</h1>

          <div className="w-full overflow-hidden rounded-lg border flex-1 flex flex-col">
            <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-3 bg-gray-100 border-b text-sm font-semibold text-gray-700">
              <div>Name</div>
              <div>Student ID</div>
              <div>Book Borrowed</div>
              <div>Date</div>
              <div>Due Date</div>
              <div>Status</div>
              <div>More</div>
            </div>

            <div className="divide-y">
              {borrowedHistory.map((book) => (
                <div
                  key={book.borrow_id}
                  className="grid grid-cols-1 sm:grid-cols-7 gap-4 px-4 py-3 hover:bg-gray-50 transition-all text-sm items-center"
                >
                  <div className="font-semibold text-gray-800">{book.student_name}</div>
                  <div className="font-semibold text-gray-800">{book.student_school_id}</div>
                  <div className="font-semibold text-gray-800">{book.book_title}</div>
                  <div className="text-gray-700">
                    {new Date(book.borrow_date).toDateString()}
                  </div>
                  <div className="font-semibold text-red-700">
                    {new Date(book.due_date).toDateString()}
                  </div>
                  <div
                    className={`flex font-semibold text-sm ${
                      book.status === "pending"
                        ? "text-gray-700"
                        : book.status === "returned"
                        ? "text-green-700"
                        : book.status === "overdue"
                        ? "text-red-700"
                        : book.status === "missing"
                        ? "text-orange-700"
                        : "text-blue-700"
                    }`}
                  >
                    {book.status}
                  </div>

                  <div className="flex flex-row justify-between">
                    <Dialog>
                      <DialogTrigger asChild>
                        <MoreHorizontal className="text-xs transition-transform hover:scale-[1.1] cursor-pointer" />
                      </DialogTrigger>

                      <BorrowMoreModal
                        extendSubmitted={extendSubmitted}
                        borrowedSubmitted={borrowedSubmitted}
                        returnedSubmitted={returnedSubmitted}
                        overdueSubmitted={overdueSubmitted}
                        missingSubmitted={missingSubmitted}
                        BorrowedOnClick={() => {
                          if (book.status === "borrowed") {
                            toast.error("This book is already marked as borrowed.");
                            return;
                          }
                          setStudentBorrowedStatus(book.borrow_id, "borrowed");
                        }}
                        ReturnedOnClick={() => {
                          if (book.status === "returned") {
                            toast.error("This book is already marked as returned.");
                            return;
                          }
                          setStudentBorrowedStatus(book.borrow_id, "returned");
                        }}
                        OverdueOnClick={() => {
                          if (book.status === "overdue") {
                            toast.error("This book is already marked as overdue.");
                            return;
                          }
                          setStudentBorrowedStatus(book.borrow_id, "overdue");
                        }}
                        MissingOnClick={() => {
                          if (book.status === "missing") {
                            toast.error("This book is already marked as missing.");
                            return;
                          }
                          setStudentBorrowedStatus(book.borrow_id, "missing");
                        }}
                        dueDateValue={extendDueDateValue}
                        onDueDateChange={setExtendDueDateValue}
                        ExtendOnClick={() => extendDueDate(book.borrow_id)}
                        penaltyValue={book.penalty || 0}
                        isOverDue={book.status === "overdue"}
                      />
                    </Dialog>

                    {
                      book.status === "pending"
                      &&
                      <Dialog
                        onOpenChange={(isOpen) => {
                          if (!isOpen) {
                            // modal closed → stop camera
                            scannerRef.current?.clearScanner();
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <ScanQrCode
                            className="w-5 h-5 cursor-pointer transition-transform hover:text-indigo-700 hover:scale-[1.05]"
                            onClick={() => {
                              setTimeout(() => {
                                scannerRef.current?.startScanner();
                              }, 100);
                            }}
                          />
                        </DialogTrigger>

                        <ScanBorrowQr
                          ref={scannerRef}
                          onScan={(record) => {
                            console.log("Borrow record:", record);
                          }}
                        />
                      </Dialog>
                    }

                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
