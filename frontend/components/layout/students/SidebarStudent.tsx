"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Book,
  LogOut,
  ChevronLeft,
  Bell,
  UserCircle,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import Cpc from "@/public/cpc-logo.png";
import { toast } from "sonner";
import api from "@/lib/api";
import { ButtonSubmit } from "../../button";

export default function SidebarStudent(props: {
  onClickBtnOpenSideBar: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  return (
    <>
      <div className="hidden md:block w-64 bg-indigo-900 text-white min-h-screen p-6 relative">
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="mb-8">
              <div className="flex justify-between items-center space-x-3">
                <div className="flex items-center space-x-3">
                  {/* <BookOpen className="w-8 h-8" /> */}
                  <img
                    src={Cpc.src}
                    alt="Cpc Logo"
                    className="w-10 h-10 border-white border-2 rounded-full"
                  />
                  <div>
                    <h2 className="font-bold text-lg">CPC Library</h2>
                    <p className="text-xs text-indigo-300">Student Panel</p>
                  </div>
                </div>

                <button onClick={props.onClickBtnOpenSideBar}>
                  <ChevronLeft className="w-7 h-7" />
                </button>
              </div>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full text-md flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.path
                      ? "bg-indigo-800"
                      : "hover:bg-indigo-800"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="w-full">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center w-full space-x-3 px-4 py-3 text-red-300 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

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
              <div className="grid grid-cols-2 space-x-4">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>

                <ButtonSubmit
                  props={{
                    submitted: submitted,
                    buttonType: "button",
                    className:
                      "flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 w-full h-full text-md",
                    btnOnClick: handleLogout,
                    btnText: "Logout",
                    btnLoadingText: "Logging out",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
