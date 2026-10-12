import { createFileRoute } from '@tanstack/react-router';
import { workspaceBilling } from '../../../lib/billing/workspace.server';
export const Route = createFileRoute('/api/billing/workspace')({ server: { handlers: { POST: ({request}) => workspaceBilling(request) } } });
