import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertAttendanceRecordSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new attendance session
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  // Get active sessions
  app.get("/api/sessions/active", async (req, res) => {
    try {
      const sessions = await storage.getActiveSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get session by ID
  app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
      const session = await storage.getSessionBySessionId(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // End a session
  app.patch("/api/sessions/:sessionId/end", async (req, res) => {
    try {
      const session = await storage.endSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // Record attendance
  app.post("/api/attendance", async (req, res) => {
    try {
      const attendanceData = insertAttendanceRecordSchema.parse(req.body);
      
      // Check if session exists and is active
      const session = await storage.getSessionBySessionId(attendanceData.sessionId.toString());
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (!session.isActive) {
        return res.status(400).json({ message: "Session is no longer active" });
      }

      // Check if student already checked in
      const existingRecord = await storage.getAttendanceRecord(
        session.id,
        attendanceData.studentId
      );
      
      if (existingRecord) {
        return res.status(409).json({ 
          message: "Already checked in",
          checkinTime: existingRecord.checkinTime 
        });
      }

      const record = await storage.recordAttendance({
        ...attendanceData,
        sessionId: session.id,
        ipAddress: req.ip || req.connection.remoteAddress || null,
      });
      
      res.json(record);
    } catch (error) {
      console.error("Error recording attendance:", error);
      res.status(400).json({ message: "Invalid attendance data" });
    }
  });

  // Get attendance for a session
  app.get("/api/sessions/:sessionId/attendance", async (req, res) => {
    try {
      const session = await storage.getSessionBySessionId(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const attendance = await storage.getSessionAttendance(session.id);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  // Get recent sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const sessions = await storage.getRecentSessions(limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching recent sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Validate session for student check-in
  app.get("/api/sessions/:sessionId/validate", async (req, res) => {
    try {
      const session = await storage.getSessionBySessionId(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (!session.isActive) {
        return res.status(400).json({ message: "Session is no longer active" });
      }

      // Check if session has expired (assuming duration is the limit)
      const now = new Date();
      const sessionEnd = new Date(session.startTime.getTime() + session.duration * 60000);
      
      if (now > sessionEnd) {
        // Auto-end expired session
        await storage.endSession(req.params.sessionId);
        return res.status(400).json({ message: "Session has expired" });
      }

      res.json({
        sessionId: session.sessionId,
        courseName: session.courseName,
        sessionTitle: session.sessionTitle,
        sessionType: session.sessionType,
        location: session.location,
        startTime: session.startTime,
        duration: session.duration,
        isActive: session.isActive,
      });
    } catch (error) {
      console.error("Error validating session:", error);
      res.status(500).json({ message: "Failed to validate session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
