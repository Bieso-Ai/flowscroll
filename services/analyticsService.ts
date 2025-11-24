import { TaskResult } from "../types";

const API_ENDPOINT = "/.netlify/functions/record-task";

export const analyticsService = {
  recordTaskResult: (userId: string, result: TaskResult) => {
    const payload = {
      userId,
      taskId: result.taskId,
      type: result.type,
      success: result.success,
      outcome: result.outcome, // New
      timeSpentMs: result.timeSpentMs,
      difficultyLevel: result.difficultyLevel,
      timestamp: new Date(result.timestamp).toISOString(), // ISO string for DB
      startTime: new Date(result.startTime).toISOString(), // ISO string for DB
      wasSkipped: result.wasSkipped,
      sessionId: result.sessionId, // New
      sessionDurationMs: result.sessionDurationMs // New
    };

    if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(API_ENDPOINT, blob);
    } else {
        fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(err => console.warn("Analytics Sync Failed:", err));
    }
  }
};
