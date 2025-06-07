import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Clock, MapPin, Download, StopCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateQRCode } from "@/lib/qr-utils";
import type { Session, InsertSession, AttendanceRecord } from "@shared/schema";

export default function LecturerDashboard() {
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [formData, setFormData] = useState({
    courseName: "",
    sessionTitle: "",
    sessionType: "Lecture",
    location: "",
    duration: 60,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recent sessions
  const { data: recentSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const response = await fetch("/api/sessions?limit=10");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json() as Promise<Session[]>;
    },
  });

  // Fetch attendance for active session
  const { data: attendance = [], refetch: refetchAttendance } = useQuery({
    queryKey: ["/api/sessions", activeSession?.sessionId, "attendance"],
    queryFn: async () => {
      if (!activeSession) return [];
      const response = await fetch(`/api/sessions/${activeSession.sessionId}/attendance`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      return response.json() as Promise<AttendanceRecord[]>;
    },
    enabled: !!activeSession,
    refetchInterval: activeSession ? 5000 : false, // Refetch every 5 seconds when session is active
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: InsertSession) => {
      const response = await apiRequest("POST", "/api/sessions", sessionData);
      return response.json() as Promise<Session>;
    },
    onSuccess: async (session) => {
      const sessionId = session.sessionId;
      const qrData = JSON.stringify({
        sessionId,
        timestamp: new Date().toISOString(),
        type: "attendance",
      });

      try {
        const qrUrl = await generateQRCode(qrData);
        setQrCodeUrl(qrUrl);
        setActiveSession(session);
        setIsCreatingSession(false);
        queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
        toast({
          title: "Session Created",
          description: "QR code generated successfully. Students can now check in.",
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
        toast({
          title: "Error",
          description: "Failed to generate QR code.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("PATCH", `/api/sessions/${sessionId}/end`);
      return response.json();
    },
    onSuccess: () => {
      setActiveSession(null);
      setQrCodeUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Session Ended",
        description: "The attendance session has been closed.",
      });
    },
    onError: (error) => {
      console.error("Error ending session:", error);
      toast({
        title: "Error",
        description: "Failed to end session.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSession = () => {
    if (!formData.courseName || !formData.sessionTitle) {
      toast({
        title: "Missing Information",
        description: "Please fill in the course name and session title.",
        variant: "destructive",
      });
      return;
    }

    const sessionId = `${formData.courseName.replace(/\s+/g, "").toUpperCase()}-${Date.now()}`;
    const sessionData: InsertSession = {
      sessionId,
      courseName: formData.courseName,
      sessionTitle: formData.sessionTitle,
      sessionType: formData.sessionType,
      location: formData.location,
      startTime: new Date(),
      duration: formData.duration,
      createdBy: 1, // TODO: Get from auth context
    };

    createSessionMutation.mutate(sessionData);
  };

  const handleEndSession = () => {
    if (activeSession) {
      endSessionMutation.mutate(activeSession.sessionId);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `qr-${activeSession?.sessionId}.png`;
      link.click();
    }
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Session Creation Card */}
      <Card className="shadow-material">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">Create Attendance Session</CardTitle>
              <p className="text-gray-600 mt-1">Generate a QR code for student check-in</p>
            </div>
            <div className="hidden sm:block">
              <Users className="h-10 w-10 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!activeSession ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="courseName">Course Name</Label>
                  <Input
                    id="courseName"
                    value={formData.courseName}
                    onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                    placeholder="e.g., Computer Science 101"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="sessionType">Session Type</Label>
                  <Select
                    value={formData.sessionType}
                    onValueChange={(value) => setFormData({ ...formData, sessionType: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lecture">Lecture</SelectItem>
                      <SelectItem value="Lab Session">Lab Session</SelectItem>
                      <SelectItem value="Tutorial">Tutorial</SelectItem>
                      <SelectItem value="Seminar">Seminar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="sessionTitle">Session Title</Label>
                  <Input
                    id="sessionTitle"
                    value={formData.sessionTitle}
                    onChange={(e) => setFormData({ ...formData, sessionTitle: e.target.value })}
                    placeholder="e.g., Introduction to React"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Room 301"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                    min="5"
                    max="300"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleCreateSession}
                  disabled={createSessionMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createSessionMutation.isPending ? (
                    "Creating..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Session QR
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Active Session Display */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary rounded-full mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Active</h3>
              <p className="text-gray-600 mb-6">Students can now scan the QR code to check in</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* QR Code Display */}
                <div className="flex flex-col items-center">
                  <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-4">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="Session QR Code" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500">Generating QR Code...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Session ID: <span className="font-mono font-medium">{activeSession.sessionId}</span>
                  </p>
                  <p className="text-sm text-gray-600">Show this QR code to students</p>
                </div>

                {/* Session Info & Controls */}
                <div className="space-y-6">
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Session Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Course:</span>
                          <span className="font-medium">{activeSession.courseName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{activeSession.sessionType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Started:</span>
                          <span className="font-medium">{formatTime(activeSession.startTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="text-secondary font-medium flex items-center">
                            <div className="w-2 h-2 bg-secondary rounded-full mr-1 animate-pulse"></div>
                            Active
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Live Attendance</h4>
                        <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                          {attendance.length} Present
                        </span>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {attendance.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No students checked in yet
                          </p>
                        ) : (
                          attendance.slice(0, 5).map((record) => (
                            <div key={record.id} className="flex items-center justify-between py-1">
                              <span className="text-sm font-medium">{record.studentName}</span>
                              <span className="text-xs text-gray-600">{formatTime(record.checkinTime)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleEndSession}
                      disabled={endSessionMutation.isPending}
                      variant="destructive"
                      className="flex-1"
                    >
                      <StopCircle className="w-4 h-4 mr-2" />
                      End Session
                    </Button>
                    <Button onClick={downloadQRCode} variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download QR
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card className="shadow-material">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-gray-900">Recent Sessions</CardTitle>
            <Button variant="ghost" className="text-primary hover:text-primary/90">
              View All <Eye className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading sessions...</p>
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No sessions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Course</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Time</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{session.courseName}</p>
                          <p className="text-sm text-gray-500">{session.sessionTitle}</p>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-gray-600">{formatDate(session.startTime)}</td>
                      <td className="py-4 text-sm text-gray-600">{formatTime(session.startTime)}</td>
                      <td className="py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            session.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {session.isActive ? "Active" : "Completed"}
                        </span>
                      </td>
                      <td className="py-4">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
