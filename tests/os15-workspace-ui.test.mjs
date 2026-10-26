import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const d=read('src/components/dashboard/ExecutiveDashboard.tsx'),
 a=read('src/components/AppShell.tsx'),
 css=read('src/styles/liquid-precision.css'),
 f=read('src/app/finanzas/page.tsx'),
 q=read('src/app/cotizaciones/[id]/page.tsx'),
 presentation=read('src/components/quotes/QuotePresentation.tsx'),
 counter=read('src/components/motion/AnimatedValue.tsx'),
 reveal=read('src/components/motion/WorkspaceMotion.tsx'),
 prefs=read('src/components/motion/WorkspacePreferences.tsx');
test('Authenticated server workspace keeps role filters and no new client access',()=>{
 for(const pattern of [/canVisit\(role, m\.slug\)/,/signOut/,/isPilotReadOnly\(\)/,/<WorkspaceMotion\/>/,/<WorkspacePreferences\/>/])assert.match(a,pattern);
 for(const code of [presentation,counter,reveal,prefs]){
  assert.doesNotMatch(code,/\bsupabase\b|service_role|\bfetch\(|signInWithPassword|updateUser/);
 }
});
test('Real role-scoped dashboard retains server numbers and empty states',()=>{
 for(const key of ['r.sales.activeOpportunities','r.operations.active','r.finance.acceptedOpenMinorAll','r.sales.quotesInReview','report.role===\'owner\'']){
  assert.ok(d.includes(key),key);
 }
 assert.match(d,/AnimatedValue value=\{value\} display=\{display\} mode=\{mode\}/);
 assert.match(d,/acceptedOpenMinorAll\} mode="money"/);
 assert.match(d,/if\(total===0\)return <EmptyState/);
 assert.doesNotMatch(d,/DEMO_PROJECTS|DEMO_SERIES|Math\.random/);
});
test('Finance flags and authority of money unchanged',()=>{
 assert.match(f,/OS08_FINANCE_WRITES_ENABLED/);
 assert.match(f,/isPilotReadOnly\(\)/);
 assert.match(f,/signedMoneyMXN\(value\)/);
 assert.match(f,/AnimatedValue value=\{value\}/);
});
test('Quote format is presentation-only and real approval and PDF contract remain',()=>{
 for(const p of [/requireMembership\('cotizaciones'\)/,/getQuoteDetail\(id\)/,/OS07_QUOTES_WRITES_ENABLED/,/quote\.totalMinor/,/QuoteTransitionForm/,/quote\.history\.map/,/<QuotePresentation pdfHref=/])assert.match(q,p);
 assert.match(q,/\/pdf'/);
 assert.match(presentation,/aria-pressed=\{appearance==='statement'\}/);
 assert.match(presentation,/aria-pressed=\{appearance==='atelier'\}/);
 assert.doesNotMatch(presentation,/renderQuotePdf|fetch\(|Math\.random|setStatus/);
});
test('Animated numbers keep static accessible truth and stop when reduced',()=>{
 assert.match(counter,/className="sr-only">\{display\}/);
 assert.match(counter,/aria-hidden="true"/);
 assert.match(counter,/Number\.isSafeInteger/);
 assert.match(counter,/requestAnimationFrame/);
 assert.match(counter,/cancelAnimationFrame/);
 assert.match(counter,/prefers-reduced-motion/);
});
test('Motion has finite entrance and both system and manual reduced modes',()=>{
 assert.match(reveal,/\.slice\(0,26\)/);
 assert.match(reveal,/IntersectionObserver/);
 assert.match(reveal,/\.animate\(/);
 assert.match(reveal,/observer\?\.disconnect/);
 assert.match(css,/@keyframes lp-progress-reveal/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/html\[data-lp-motion=reduce\]/);
 assert.match(css,/@media \(prefers-reduced-transparency:reduce\)/);
 assert.match(prefs,/prefers-reduced-transparency/);
 assert.match(prefs,/localStorage/);
 assert.doesNotMatch(reveal,/setInterval|setTimeout\(/);
});
test('No dependency added and original PDF arithmetic stays unchanged',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies.motion,undefined);
 assert.equal(pkg.dependencies.gsap,undefined);
 const pdf=read('src/lib/quotes/pdf.ts');
 assert.match(pdf,/line\.unit_minor\*line\.quantity/);
 assert.match(pdf,/Esta cotización no es un CFDI/);
});

test('Style choices are constrained while server PDF route still authenticates',()=>{
 const route=read('src/app/cotizaciones/[id]/pdf/route.ts');
 const renderer=read('src/lib/quotes/pdf.ts');
 assert.match(route,/getQuoteDetail\(id\)/);
 assert.match(route,/searchParams.get\('style'\)==='atelier'/);
 assert.match(route,/renderQuotePdf\(quote,appearance\)/);
 assert.match(renderer,/quote\.subtotalMinor/);
 assert.match(renderer,/quote\.taxMinor/);
 assert.match(renderer,/quote\.totalMinor/);
 assert.match(renderer,/export type QuotePdfAppearance='statement'\|'atelier'/);
 assert.match(renderer,/Esta cotización no es un CFDI/);
 assert.match(presentation,/\?style=atelier/);
});
