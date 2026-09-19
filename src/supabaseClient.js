// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://whattksidsddgixhazxi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YDAnYAAolVL7ey5QC1cNhw_1Jv1Zi9O";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);