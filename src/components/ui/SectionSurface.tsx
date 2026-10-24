import type { ReactNode } from 'react';
type Props={title:string;subtitle:string;action?:ReactNode;children:ReactNode;className?:string};
export function SectionSurface({title,subtitle,action,children,className=''}:Props) {
  return <section className={['panel',className].filter(Boolean).join(' ')}>
    <div className="panel-head">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {action}
    </div>
    {children}
  </section>;
}
