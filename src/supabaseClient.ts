import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ytfrogvipwzfsdkouxyr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0ZnJvZ3ZpcHd6ZnNka291eHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzc2MTEsImV4cCI6MjA5MDY1MzYxMX0.t7HpBj9M60Vu61ptlouePEyxyf_5Zm6XP_PTf2J1yYI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
