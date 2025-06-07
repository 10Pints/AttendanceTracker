import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, UserCheck, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRScanner from "@/components/qr-scanner";
import type { Session, AttendanceRecord } from "@shared/schema";

export default function StudentInterface() {
  const [studentData, setStudentData] = useState({
    studentId: "",
    studentName: "",
    studentEmail: "",
  });
  const [isScanning, setIsScanning] = useState(false);
  const [detectedSession, setDetectedSession] = useState<Session | null>(null);
  const [checkinResult, setCheckinResult] = useState<AttendanceRecord | null>(null);
  const [manualSessionId, setManualSessionId] = useState("");

  const { toast } = useToast();

  // Validate session mutation
  const validateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}/validate`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Session validation failed");
      }
      return response.json() as Promise<Session>;
    },
    onSuccess: (session) => {
      setDetectedSession(session);
      toast({
        title: "Session Found",
        description: `${session.courseName} - ${session.sessionTitle}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid Session",
        description: error.message,
        variant: "destructive",
      });
      setDetectedSession(null);
    },
  });

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!detectedSession || !studentData.studentId || !studentData.studentName) {
        throw new Error("Missing required information");
      }

      const response = await apiRequest("POST", "/api/attendance", {
        sessionId: detectedSession.id,
        studentId: studentData.studentId,
        studentName: studentData.studentName,
        studentEmail: studentData.studentEmail || null,
      });
      return response.json() as Promise<AttendanceRecord>;
    },
    onSuccess: (record) => {
      setCheckinResult(record);
      setDetectedSession(null);
      setIsScanning(false);
      toast({
        title: "Check-in Successful",
        description: "Your attendance has been recorded!",
      });
    },
    onError: (error: Error) => {
      const message = error.message.includes("Already checked in")
        ? "You have already checked in to this session."
        : "Failed to record attendance. Please try again.";
      
      toast({
        title: "Check-in Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleQRDetected = (data: string) => {
    try {
      const qrData = JSON.parse(data);
      if (qrData.type === "attendance" && qrData.sessionId) {
        validateSessionMutation.mutate(qrData.sessionId);
        setIsScanning(false);
      } else {
        throw new Error("Invalid QR code format");
      }
    } catch (error) {
      toast({
        title: "Invalid QR Code",
        description: "This QR code is not for attendance.",
        variant: "destructive",
      });
    }
  };

  const handleManualEntry = () => {
    if (!manualSessionId.trim()) {
      toast({
        title: "Missing Session ID",
        description: "Please enter a session ID.",
        variant: "destructive",
      });
      return;
    }
    validateSessionMutation.mutate(manualSessionId.trim());
  };

  const handleCheckin = () => {
    if (!studentData.studentId || !studentData.studentName) {
      toast({
        title: "Missing Information",
        description: "Please fill in your student ID and name.",
        variant: "destructive",
      });
      return;
    }
    checkinMutation.mutate();
  };

  const resetSession = () => {
    setDetectedSession(null);
    setCheckinResult(null);
    setManualSessionId("");
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-4">
          <UserCheck className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Student Check-in</h2>
        <p className="text-gray-600 mt-2">
          Scan the QR code displayed by your lecturer to mark your attendance
        </p>
      </div>

      {checkinResult ? (
        /* Success State */
        <div className="max-w-md mx-auto">
          <Card className="shadow-material border-green-200">
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Attendance Recorded!</h3>
              <p className="text-gray-600 mb-6">
                Your attendance has been successfully marked for this session.
              </p>
              
              <Card className="bg-gray-50 mb-6">
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Student:</span>
                      <span className="font-medium">{checkinResult.studentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Student ID:</span>
                      <span className="font-medium">{checkinResult.studentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{formatTime(checkinResult.checkinTime)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={resetSession} className="w-full bg-primary hover:bg-primary/90">
                <Camera className="w-4 h-4 mr-2" />
                Scan Another QR Code
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Student Information Form */}
          <div className="max-w-md mx-auto">
            <Card className="shadow-material">
              <CardHeader>
                <CardTitle className="text-center">Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="studentId">Student ID *</Label>
                  <Input
                    id="studentId"
                    value={studentData.studentId}
                    onChange={(e) => setStudentData({ ...studentData, studentId: e.target.value })}
                    placeholder="Enter your student ID"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="studentName">Full Name *</Label>
                  <Input
                    id="studentName"
                    value={studentData.studentName}
                    onChange={(e) => setStudentData({ ...studentData, studentName: e.target.value })}
                    placeholder="Enter your full name"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="studentEmail">Email (Optional)</Label>
                  <Input
                    id="studentEmail"
                    type="email"
                    value={studentData.studentEmail}
                    onChange={(e) => setStudentData({ ...studentData, studentEmail: e.target.value })}
                    placeholder="your.email@university.edu"
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {detectedSession ? (
            /* Session Detected */
            <div className="max-w-md mx-auto">
              <Card className="shadow-material border-blue-200">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Session Detected</h4>
                  </div>
                  
                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Course:</span>
                      <span className="font-medium">{detectedSession.courseName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Session:</span>
                      <span className="font-medium">{detectedSession.sessionTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{detectedSession.sessionType}</span>
                    </div>
                    {detectedSession.location && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{detectedSession.location}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Started:</span>
                      <span className="font-medium">{formatTime(detectedSession.startTime)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleCheckin}
                      disabled={checkinMutation.isPending || !studentData.studentId || !studentData.studentName}
                      className="flex-1 bg-secondary hover:bg-secondary/90"
                    >
                      {checkinMutation.isPending ? (
                        "Checking in..."
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Check In
                        </>
                      )}
                    </Button>
                    <Button onClick={resetSession} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* QR Scanner */}
              <div className="max-w-md mx-auto">
                <Card className="shadow-material">
                  <CardHeader>
                    <CardTitle className="text-center">Scan QR Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <QRScanner
                      onScan={handleQRDetected}
                      isScanning={isScanning}
                      onStartScan={() => setIsScanning(true)}
                      onStopScan={() => setIsScanning(false)}
                    />
                    
                    <div className="mt-6 text-sm text-gray-600 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Position the QR code within the frame
                      </div>
                      <p>The scanner will automatically detect and process the code</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Manual Entry */}
              <div className="max-w-md mx-auto">
                <Card className="shadow-material">
                  <CardHeader>
                    <CardTitle className="text-center">Alternative Check-in</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 text-center mb-4">
                      If you can't scan the QR code, enter the session ID manually
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="manualSessionId">Session ID</Label>
                        <Input
                          id="manualSessionId"
                          value={manualSessionId}
                          onChange={(e) => setManualSessionId(e.target.value)}
                          placeholder="e.g., CS101-1234567890"
                          className="mt-2"
                        />
                      </div>
                      <Button
                        onClick={handleManualEntry}
                        disabled={validateSessionMutation.isPending}
                        className="w-full bg-accent hover:bg-accent/90"
                      >
                        {validateSessionMutation.isPending ? (
                          "Validating..."
                        ) : (
                          <>
                            <Clock className="w-4 h-4 mr-2" />
                            Check-in Manually
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
