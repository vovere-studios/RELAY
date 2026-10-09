/** Describe invalid controls without moving focus or scrolling the form. */
export function formValidationMessage(form: HTMLFormElement): string {
  const fields = Array.from(form.elements).filter((field): field is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
    (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) && !field.disabled && !field.validity.valid);
  const malformedEmail = fields.find(field => field instanceof HTMLInputElement && field.type === "email" && field.validity.typeMismatch);
  if (malformedEmail) return "Enter a valid work email address, for example name@company.com.";
  const names = [...new Set(fields.map(field => {
    const label = field.labels?.[0];
    const text = label ? Array.from(label.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim() : "";
    return (text || field.name.replace(/[_-]/g, " ") || "required information").toLowerCase();
  }))];
  if (!names.length) return "Complete the highlighted fields to continue.";
  const visible = names.slice(0, 3);
  const joined = visible.length === 1 ? visible[0] : `${visible.slice(0, -1).join(", ")} and ${visible.at(-1)}`;
  return `Complete ${joined}${names.length > 3 ? " and the remaining highlighted fields" : ""} to continue.`;
}
