"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Book, LogOut, Menu, Search, UserCircle } from "lucide-react";
import { useState } from "react";
import Cpc from '@/public/cpc-logo.png';
import { toast } from "sonner";
import api from "@/lib/api";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { path: "/students/profile", icon: UserCircle, label: "Profile" },
    { path: "/students/dashboard", icon: Home, label: "Dashboard" },
    { path: "/students/browse-books", icon: Search, label: "Browse Books" },
    { path: "/students/borrowed-books", icon: Book, label: "Borrowed Books" },
  ];

  const handleLogout = async () => {
    try {
      const result = await api.get("/api/students/logout");
      if (result.data.success) {
        toast.success("Logout Successfully");
        router.push("/students/auth/login");
      }
    } catch (error: any) {
      toast.error(error.response.data.message + "error");
      console.log(error);
      return;
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="bg-indigo-900 text-white p-6 flex justify-between items-center px-15 md:hidden">
        <div className="flex items-center space-x-3">
          {/* <BookOpen className="w-8 h-8"/> */}
          <img src={Cpc.src} alt="Cpc Logo" className="w-10 h-10 border-white border-2 rounded-full"/>
            <div className="flex flex-col">
CPC Library
              <p className="text-xs text-indigo-300">Admin Panel</p>
            </div>
        </div>

        <nav>
          <button onClick={() => setOpen(!open)}>
            <Menu />
          </button>

          {open && (
            <div className="absolute right-6 top-20 bg-white text-black rounded shadow p-3 w-40 flex flex-col space-y-2">
              {menuItems.map((item) => (
                <button
                  className={`flex items-center gap-2 text-xs p-2 rounded transition-colors ${
                    pathname === item.path
                      ? "bg-indigo-800 text-white"
                      : "hover:bg-indigo-800"
                  }`}
                  key={item.path}
                  onClick={() => router.push(item.path)}
                >
                  <item.icon className="w-5 h-5" />
                  <p>{item.label}</p>
                </button>
              ))}

              <div className="bottom-6 w-full">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="text-xs flex justify-start w-full items-center space-x-3 px-1 py-3 text-red-600"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
          )}

          {showLogoutModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Confirm Logout
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to logout?
                  </p>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setShowLogoutModal(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
