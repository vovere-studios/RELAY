import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Info, X } from "lucide-react";
import { OutcomeMark } from "./ActionFeedback";
type Tone = "success" | "error" | "info";
type Message = { id: number; title: string; detail?: string; tone: Tone };
const FeedbackContext = createContext<(title: string, detail?: string, tone?: Tone) => void>(
  () => {},
);
function Toast({
  message,
  remove,
}: {
  message: Message;
  remove: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [exiting, setExiting] = useState(false);
  const remaining = useRef(5500);
  useEffect(() => {
    if (paused || hidden || exiting) return;
    const started = Date.now();
    const timer = setTimeout(() => setExiting(true), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - started),
      );
    };
  }, [paused, hidden, exiting]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(
      () => remove(message.id),
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180,
    );
    return () => clearTimeout(timer);
  }, [exiting, message.id, remove]);
  return (
    <div className="toast-frame" data-exiting={exiting}>
      <div
        className="toast"
        data-tone={message.tone}
        role={message.tone === "error" ? "alert" : "status"}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={(event) =>
          setPaused(event.currentTarget.contains(document.activeElement))
        }
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setPaused(event.currentTarget.matches(":hover"));
        }}
      >
        <span className="toast-check">
          {message.tone === "info" ? <Info size={16}/> : <OutcomeMark tone={message.tone}/>}
        </span>
        <div>
          <strong>{message.title}</strong>
          {message.detail && <p>{message.detail}</p>}
        </div>
        <button aria-label="Dismiss message" onClick={() => setExiting(true)}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(0);
  const remove = useCallback(
    (id: number) =>
      setMessages((previous) =>
        previous.filter((message) => message.id !== id),
      ),
    [],
  );
  function notify(title: string, detail?: string, tone: Tone = "success") {
    const id = ++nextId.current;
    setMessages((previous) => [...previous.slice(-2), { id, title, detail, tone }]);
  }
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-label="Status messages">
        {messages.map((message) => (
          <Toast key={message.id} message={message} remove={remove} />
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}
export const useFeedback = () => useContext(FeedbackContext);
