import { sessions, attendanceRecords, users, type Session, type InsertSession, type AttendanceRecord, type InsertAttendanceRecord, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Updated interface with attendance methods
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session management
  createSession(session: InsertSession): Promise<Session>;
  getSessionBySessionId(sessionId: string): Promise<Session | undefined>;
  getActiveSessions(): Promise<Session[]>;
  getRecentSessions(limit: number): Promise<Session[]>;
  endSession(sessionId: string): Promise<Session | undefined>;
  
  // Attendance management
  recordAttendance(attendance: InsertAttendanceRecord & { sessionId: number }): Promise<AttendanceRecord>;
  getSessionAttendance(sessionId: number): Promise<AttendanceRecord[]>;
  getAttendanceRecord(sessionId: number, studentId: string): Promise<AttendanceRecord | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createSession(sessionData: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getSessionBySessionId(sessionId: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId));
    return session || undefined;
  }

  async getActiveSessions(): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.isActive, true))
      .orderBy(desc(sessions.startTime));
  }

  async getRecentSessions(limit: number): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(limit);
  }

  async endSession(sessionId: string): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.sessionId, sessionId))
      .returning();
    return session || undefined;
  }

  async recordAttendance(attendanceData: InsertAttendanceRecord & { sessionId: number }): Promise<AttendanceRecord> {
    const [record] = await db
      .insert(attendanceRecords)
      .values(attendanceData)
      .returning();
    return record;
  }

  async getSessionAttendance(sessionId: number): Promise<AttendanceRecord[]> {
    return await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, sessionId))
      .orderBy(desc(attendanceRecords.checkinTime));
  }

  async getAttendanceRecord(sessionId: number, studentId: string): Promise<AttendanceRecord | undefined> {
    const [record] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.sessionId, sessionId),
          eq(attendanceRecords.studentId, studentId)
        )
      );
    return record || undefined;
  }
}

export const storage = new DatabaseStorage();
