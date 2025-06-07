import { useState } from "react";
import { useLocation } from "wouter";
import { GraduationCap, UserCheck } from "lucide-react";
import LecturerDashboard from "@/components/lecturer-dashboard";
import StudentInterface from "@/components/student-interface";

export default function Home() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<"lecturer" | "student">(
    location.includes("student") ? "student" : "lecturer"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-material sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">EduAttend</h1>
                <p className="text-sm text-gray-500">Attendance Management</p>
              </div>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("lecturer")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "lecturer"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <UserCheck className="w-4 h-4 mr-2 inline" />
                Lecturer
              </button>
              <button
                onClick={() => setActiveTab("student")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "student"
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <GraduationCap className="w-4 h-4 mr-2 inline" />
                Student
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "lecturer" ? <LecturerDashboard /> : <StudentInterface />}
      </main>
    </div>
  );
}
