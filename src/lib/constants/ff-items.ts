import { supabaseUrl } from "@/lib/supabase/env";

// Base URL for Free Fire item/character/weapon images stored in the public
// `ff-items` Supabase Storage bucket. Files are named `<id>.png`.
export const FF_ITEM_IMAGE_BASE_URL = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/ff-items`
  : "";
