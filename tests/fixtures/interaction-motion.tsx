// Browser QA for the real components, with no authentication, API calls or persistent data.
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ActionButton, ActionIcon, OutcomeMark, useActionFeedback } from '../../src/components/ActionFeedback';
import { InteractionMotion } from '../../src/components/InteractionMotion';
import { Button, Dialog, Input } from '../../src/components/ui';
import { Select } from '../../src/components/Select';
import '../../src/styles.css';
import '../../src/styles/refinement.css';
import '../../src/styles/connected.css';
import '../../src/styles/polish.css';
import '../../src/styles/interactions.css';

function Fixture() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const feedback = useActionFeedback();
  const [presses, setPresses] = useState(0);
  const trace = useRef({ minimum: 1, frame: 0 });
  const [minimum, setMinimum] = useState(1);
  async function succeed() {
    if (!feedback.begin('save')) return;
    setMessage('');
    await new Promise(resolve => setTimeout(resolve, 650));
    feedback.succeed('save');
  }
  return <><InteractionMotion/><div style={{maxWidth: 700, margin: '60px auto', padding: 24}}>
    <p className="eyebrow">Local interaction test · no data sent</p>
    <h1 style={{fontSize: 32, marginBottom: 24}}>RELAY component QA</h1>
    <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
      <Button onClick={()=>setOpen(true)}><ActionIcon/>Open form</Button>
      <Button variant="secondary" onClick={()=>setPresses(previous=>previous+1)} onPointerDown={event=>{
        const target = event.currentTarget;
        trace.current.minimum = 1;
        cancelAnimationFrame(trace.current.frame);
        const sample = () => {
          const scale = parseFloat(getComputedStyle(target).scale);
          if (Number.isFinite(scale)) trace.current.minimum = Math.min(trace.current.minimum, scale);
          if (target.dataset.pressing === 'true') trace.current.frame = requestAnimationFrame(sample);
          else setMinimum(trace.current.minimum);
        };
        trace.current.frame = requestAnimationFrame(sample);
      }}>Press target</Button>
      <output aria-label="Press count">{presses}</output>
      <output aria-label="Measured pressure">Minimum held scale: {minimum.toFixed(3)}</output>
    </div>
    <Dialog open={open} onClose={()=>setOpen(false)} title="Your next connection.">
      <form className="workspace-form action-form" onSubmit={event=>{event.preventDefault();void succeed();}} onInvalidCapture={event=>{event.preventDefault();setMessage('Complete company name to continue.');feedback.fail('save');}} onChange={()=>{feedback.reset('save');setMessage('');}}>
        <label>Company name *<Input name="company" required/></label>
        <label>Document type<Select name="type" defaultValue="certificate"><option value="certificate">Certificate</option><option value="declaration">Declaration</option><option value="company">Company information</option></Select></label>
        <div className="action-form-footer">
          <div className="action-feedback-slot">{message && <p className="form-feedback-error" role="alert"><OutcomeMark tone="error"/><span>{message}</span></p>}</div>
          <ActionButton type="submit" label="Save to workspace" pendingLabel="Saving…" successLabel="Saved to workspace" errorLabel="Check details" phase={feedback.phase('save')} outcomeKey={feedback.version('save')}/>
        </div>
      </form>
    </Dialog>
  </div></>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
