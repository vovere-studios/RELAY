import { Children, isValidElement, type LabelHTMLAttributes, type ReactNode } from 'react';

function hasRequiredControl(children: ReactNode): boolean {
  return Children.toArray(children).some(child => isValidElement<{ required?: boolean; children?: ReactNode }>(child) &&
    (!!child.props.required || hasRequiredControl(child.props.children)));
}

/** Required state comes from the actual control, so asterisks cannot drift from validation. */
export function FieldLabel({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  const required = hasRequiredControl(children);
  let caption = false;
  return <label {...props}>{Children.map(children, child => {
    if (!caption && typeof child === 'string' && child.trim()) {
      caption = true;
      return <span className="field-caption"><span data-field-name>{child}</span>{required && <span className="field-required" aria-hidden="true">*</span>}</span>;
    }
    return child;
  })}</label>;
}
