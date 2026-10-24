import type { ReactNode } from 'react';
type Props = {symbol:string; title:string; description:string; action?:ReactNode};
export function EmptyState({symbol,title,description,action}:Props) {
  return <div className="empty" role="status" aria-label={title}>
    <span className="empty-symbol" aria-hidden="true">{symbol}</span>
    <strong>{title}</strong>
    <p>{description}</p>
    {action}
  </div>;
}
