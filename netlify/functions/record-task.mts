import { createClient } from "@supabase/supabase-js";
import type { Handler, HandlerEvent } from "@netlify/functions";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const handler: Handler = async (event: HandlerEvent) => {
  // 1. Config check
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuration error: missing Supabase env vars" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
      headers: { "Allow": "POST" },
    };
  }

  if (!event.body) {
    return { statusCode: 400, body: "Missing body" };
  }

  // 2. Parse incoming JSON
  let data: any;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    console.error("Invalid JSON body", e);
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const {
    userId,
    taskId,
    type,
    success,
    outcome,
    timeSpentMs,
    difficultyLevel,
    timestamp,
    startTime,
    wasSkipped,
    sessionId,
    sessionDurationMs,
    // Algo fields (optional)
    algo_action,
    algo_reason,
    algo_trend,
  } = data;

  // Basic validation (optional, kannst du erweitern)
  if (!userId || !type || typeof timeSpentMs !== "number") {
    console.warn("Invalid payload", data);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  // 3. Supabase insert
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from("task_history_v2")
    .insert([
      {
        user_id: userId,
        session_id: sessionId,
        task_id: taskId ?? null,
        task_type: type,
        difficulty_level: difficultyLevel,
        success: success,
        outcome: outcome,
        time_spent_ms: timeSpentMs,
        session_duration_ms: sessionDurationMs,
        client_timestamp: timestamp,
        start_time: startTime ?? null,
        was_skipped: wasSkipped,

        // Algo tracking (falls Spalten existieren)
        algo_action: algo_action ?? null,
        algo_reason: algo_reason ?? null,
        algo_trend: algo_trend ?? null,
      },
    ]);

  if (error) {
    console.error("Supabase Write Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Logged to V2", id: taskId }),
  };
};
