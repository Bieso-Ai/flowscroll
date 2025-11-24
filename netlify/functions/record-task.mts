import { createClient } from "@supabase/supabase-js";
import type { Handler, HandlerEvent } from "@netlify/functions";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const handler: Handler = async (event: HandlerEvent) => {
  // 1. Setup & Validation
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    return { statusCode: 500, body: JSON.stringify({ error: "Configuration error" }) };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!event.body) {
    return { statusCode: 400, body: "Missing body" };
  }

  // 2. Parse Data
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
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
    // Algo Fields
    algo_action,
    algo_reason,
    algo_trend
  } = data;

  // 3. Insert into Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from("task_history_v2")
    .insert([
      {
        user_id: userId,
        session_id: sessionId,
        task_type: type,
        difficulty_level: difficultyLevel,
        success: success,
        outcome: outcome,
        time_spent_ms: timeSpentMs,
        session_duration_ms: sessionDurationMs,
        client_timestamp: timestamp, 
        was_skipped: wasSkipped,
        // Algo Tracking
        algo_action: algo_action,
        algo_reason: algo_reason,
        algo_trend: algo_trend
      },
    ]);

  // 4. Response
  if (error) {
    console.error("Supabase Write Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Logged to V2", id: taskId }),
  };
};