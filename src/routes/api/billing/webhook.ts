import { createFileRoute } from '@tanstack/react-router';
import { paddleWebhook } from '../../../lib/billing/workspace.server';
export const Route = createFileRoute('/api/billing/webhook')({ server: { handlers: { POST: ({request}) => paddleWebhook(request) } } });
