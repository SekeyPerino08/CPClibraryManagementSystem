"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Book, Bell ,PanelRightClose, BookOpen, AlertCircle, CheckCircle, CreditCard} from "lucide-react";
import Sidebar from "@/components/layout/students/SidebarStudent";
import Header from "@/components/layout/students/HeaderStudent";
import api from "@/lib/api";
import { toast } from "sonner";
import { StatsCardModal } from "@/components/dashboard/StatsCard";

interface BorrowedBooks {
  book_title: string;
  borrow_date: string;
  due_date: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  //authentication access
  useEffect(() => {
    const verifyStudent = async () => {
      try {
        const result = await api.get('api/students/verify-student');
        if (!result.data.success) {
          toast.error("Login First");
          router.push('/students/auth/login');
        }

      } catch (error: any) {
        toast.error(error.response.data.message);
        console.log(error);
        router.push('/students/auth/login');
        return;
      }
    };

    verifyStudent();
  }, []);

  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBooks[]>([]);
  const [openSideBar, setOpenSideBar] = useState(true);
  const recentLimit = 3;

  useEffect(() => {
    const getMyBorrowed = async () => {
      try {
        const result = await api.get('/api/books/my-borrowed');
        setBorrowedBooks(result.data.borrowed)
      } catch (error: any) {
        toast.error(error.response.data.message)
        console.log(error);
        return;
      }
    }

    getMyBorrowed();
  }, []);

  const stats = [
    {
      title: "BookBorrowed",
      text: borrowedBooks.length,
      icon: <BookOpen />,
      bookClassName: "text-blue-700",
    },
    {
      title: "Overdue",
      text: borrowedBooks.filter(b => b.status === "overdue").length,
      icon: <AlertCircle />,
      bookClassName: "text-red-700",
    },
    {
      title: "Returned",
      text: borrowedBooks.filter(b => b.status === "returned").length,
      icon: <CheckCircle />,
      bookClassName: "text-green-700",
    },
    {
      title: "Fines",
      text: "P" + (borrowedBooks.filter(b => b.status === "overdue").length * 20),
      icon: <CreditCard />,
      bookClassName: "text-yellow-700",
    }
  ];

  return (
    <div className="flex-col md:flex-row flex h-screen overflow-hidden">
      <Header />
      {openSideBar && (
        <Sidebar onClickBtnOpenSideBar={() => setOpenSideBar(!openSideBar)} />
      )}

      <main className="flex-1 flex flex-col p-6 bg-gray-100 overflow-y-auto gap-2">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-800">Dashboard</h1>
          {!openSideBar && (
            <PanelRightClose
              className="w-6 h-6 text-indigo-700 cursor-pointer hidden md:block"
              onClick={() => setOpenSideBar(!openSideBar)}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
{stats.map((stat, index) => (
            <StatsCardModal 
              key={index}
              title={stat.title}
              text={stat.text}
              icon={stat.icon}
              bookClassName={stat.bookClassName}
              titleClassName={stat.bookClassName}
            />
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">Recent Borrow Books</h2>
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th className="text-sm border-b p-2 text-left">Book Title</th>
                <th className="text-sm border-b p-2 text-left">Borrow Date</th>

                <th className="text-sm border-b p-2 text-left">Due Date</th>
                <th className="text-sm border-b p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {borrowedBooks.slice(0, recentLimit).map((record) => (
                <tr>
                  <td className="text-sm border-b p-2 font-semibold">{record.book_title}</td>
                  <td className="text-sm border-b p-2">{new Date(record.borrow_date).toLocaleDateString()}</td>

                  <td className="text-sm border-b p-2">{new Date(record.due_date).toLocaleDateString()}</td>
                  <td className={`font-semibold text-sm border-b p-2 text-blue-700 
                    ${ record.status == "Returned" ? "text-green-700" : "text-blue-700"} 
                    ${ record.status == "Overdue" ? "text-red-700" : "text-blue-700"}`}>{record.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
