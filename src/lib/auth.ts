import { createClient } from "@supabase/supabase-js";
import { createVerdentAuth } from "@verdent/auth-js";

export const VERDENT_BAAS_KEY = "verdent-baas-key";

export const supabase = createClient(window.location.origin, VERDENT_BAAS_KEY);

export const verdentAuth = createVerdentAuth({ supabase });
