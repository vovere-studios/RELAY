import { OutcomeMark } from './ActionFeedback';
import { Button } from './ui';
/** Errors stay beside their operation and remain visible until a deliberate retry. */
export function InlineError({message,onRetry}:{message:string;onRetry?:()=>void}) {
  return <div className="form-feedback-error inline-operation-error" role="alert"><OutcomeMark tone="error"/><span>{message}</span>{onRetry&&<Button variant="ghost" onClick={onRetry}>Retry</Button>}</div>;
}
