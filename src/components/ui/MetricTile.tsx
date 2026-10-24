type Props = {label:string;value:string;hint:string};
export function MetricTile({label,value,hint}:Props) {
  return <article className="metric" aria-label={label}>
    <span>{label}</span>
    <strong aria-label={value==='—'?'Sin datos':value}>{value}</strong>
    <small>{hint}</small>
    <div className="tiny-line" aria-hidden="true" />
  </article>;
}
