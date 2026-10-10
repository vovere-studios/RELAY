import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { OutcomeMark } from './ActionFeedback';
import { Button } from './ui';
export function IntakeReceipt({company,emailStatus,onRetry}:{company:string;emailStatus:'idle'|'pending'|'sent'|'failed';onRetry?:()=>void}) {
 return <>
              <div className="intake-delivered-mark"><OutcomeMark tone="success"/></div>
              <h2>Your files have arrived.</h2>
              <p>
                Your documents are available to {company} and are awaiting review.
              </p>
              <div className="intake-email-status" role="status"><p>{emailStatus==='pending'?'Sending confirmation emails…':emailStatus==='sent'?'Confirmation emails have been sent.':"Your files are delivered. Email confirmation is currently unavailable."}</p>{emailStatus==='failed'&&onRetry&&<Button variant="ghost" onClick={onRetry}>Retry email confirmation</Button>}</div>
              <div className="access-note">
                <strong>Your next connection can be simpler.</strong>
                <span>
                  Create your Relay account to keep your documents together and
                  share them with registered companies from your workspace.
                </span>
              </div>
              <Link className="button button-primary" to="/signup">
                Create your account <ArrowUpRight size={17} />
              </Link>
              <Link className="access-secondary" to="/">
                Discover Relay
              </Link>
 </>;
}
