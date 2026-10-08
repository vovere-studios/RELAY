import { createFileRoute } from '@tanstack/react-router';
import { handleSupabaseAuthEmail } from '../../../lib/email/supabase-auth.server';
export const Route = createFileRoute('/api/auth/email-hook')({server:{handlers:{POST:({request})=>handleSupabaseAuthEmail(request)}}});
