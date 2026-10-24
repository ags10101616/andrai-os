type State='neutral'|'attention'|'success';
export function StatusTag({label,state='neutral'}:{label:string;state?:State}) {
  return <span className={'status-tag status-'+state}>{label}</span>;
}
