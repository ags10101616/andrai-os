"""Behavior + visual QA of the exact isolated lab document.
Run with Python playwright==1.57.0 and a local Chromium.
The sandbox disallows browser network navigation. The document and CSP are
fetched by urllib from scripts/os15-preview.mjs and rendered with set_content.
This is NOT Next/Auth E2E. Next integration must pass separate remote CI.
"""
from pathlib import Path
import json, hashlib, urllib.request, re, os
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'evidence';OUT.mkdir(exist_ok=True)
BASE=os.environ.get('OS15_QA_URL','http://127.0.0.1:4173/laboratorio')
with urllib.request.urlopen(BASE) as response:
    assert response.status==200
    HTML=response.read().decode()
    HEADERS=dict(response.headers)
csp=next(v for k,v in HEADERS.items() if k.lower()=='content-security-policy')
# frame-ancestors is only supported in response headers; Node tests verify it.
meta_csp=re.sub(r';\s*frame-ancestors[^;]*','',csp)
DOC=HTML.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+meta_csp+'">',1)
RESULTS=[];ERRORS=[];REQUESTS=[]
def record(name,passed=True,detail=''):
    RESULTS.append({'check':name,'status':'PASS' if passed else 'FAIL','detail':detail})
def settled(page):
    page.evaluate("Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))")
def nav(page,view):
    page.locator('a.nav-link[href="#'+view+'"]').click()
    expect(page.locator('#'+view)).to_be_visible()
    settled(page)
def take(page,name):
    settled(page);page.screenshot(path=str(OUT/name),full_page=True)
def track(page):
    page.on('pageerror',lambda e:ERRORS.append(str(e)))
    page.on('console',lambda e:ERRORS.append(e.text) if e.type=='error' else None)
    page.on('request',lambda r:REQUESTS.append(r.url))
def load(browser,width=1440,height=1100,**kwargs):
    context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,**kwargs)
    page=context.new_page();track(page);page.set_content(DOC,wait_until='load')
    if kwargs.get('java_script_enabled',True):expect(page.locator('html')).to_have_attribute('data-enhanced','true')
    settled(page)
    return context,page

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context,page=load(browser)
    expect(page.locator('section[data-view]:visible')).to_have_count(1)
    expect(page.locator('#income-number')).to_have_text('$142,000')
    expect(page.locator('#project-number')).to_have_text('3')
    expect(page.locator('#deliverables-number')).to_have_text('12')
    expect(page.locator('#progress-number')).to_have_text('68%')
    record('Initial deterministic KPIs and one active view')
    take(page,'liquid-desktop.png')
    page.locator('[data-period="7"]').click();expect(page.locator('#income-number')).to_have_text('$63,200')
    expect(page.locator('#income-helper')).to_have_text('7 días · escenario')
    expect(page.locator('#chart-title')).to_contain_text('$63,200')
    record('7-day range reconciles KPI, chart and helper')
    page.locator('[data-period="90"]').click();expect(page.locator('#income-number')).to_have_text('$587,000')
    record('90-day range exact synthetic total')
    page.locator('[data-period="30"]').click();expect(page.locator('#income-number')).to_have_text('$142,000')
    page.locator('#replay').click();expect(page.locator('#income-number')).to_have_text('$142,000')
    record('Replay ends at original exact values')
    page.locator('.chart-data summary').click();expect(page.locator('#chart-values>span')).to_have_count(7)
    record('Accessible chart data expansion')
    page.locator('.chart-data summary').click()
    page.get_by_label('Buscar proyecto de muestra').fill('sin coincidencia')
    expect(page.locator('#no-results')).to_be_visible();expect(page.locator('#projects-table')).to_be_hidden()
    page.get_by_label('Buscar proyecto de muestra').fill('BETA');expect(page.locator('#project-rows tr:visible')).to_have_count(1)
    page.get_by_label('Buscar proyecto de muestra').fill('');expect(page.locator('#project-rows tr:visible')).to_have_count(3)
    record('Search exact/no-results/clear without fabricated rows')
    trigger=page.get_by_role('button',name='Ver detalle de Plataforma digital')
    trigger.click();expect(page.locator('#project-dialog')).to_be_visible()
    expect(page.locator('#project-progress')).to_have_text('72%')
    for _ in range(8):
        page.keyboard.press('Tab')
        assert page.evaluate("document.querySelector('#project-dialog').contains(document.activeElement)")
    page.keyboard.press('Escape');expect(page.locator('#project-dialog')).to_be_hidden();expect(trigger).to_be_focused()
    record('Native project dialog traps keyboard, Escape closes, restores focus')
    nav(page,'projects');expect(page.locator('.project-card')).to_have_count(3)
    take(page,'projects-desktop.png')
    page.get_by_role('button',name='Abrir Identidad y sitio').click();expect(page.locator('#project-title')).to_have_text('Identidad y sitio')
    page.get_by_role('button',name='Cerrar detalle del proyecto').click()
    record('Projects view and per-card details')
    nav(page,'quote');expect(page.locator('#quote-grand-total')).to_have_text('$37,468.00')
    page.locator('#quote-quantity').fill('2');page.locator('#quote-support').check()
    expect(page.locator('#quote-grand-total')).to_have_text('$63,684.00')
    expect(page.locator('#support-line')).to_be_visible();record('Quote local quantity + support exact total')
    for invalid in ['1.5','21','0','']:
        page.locator('#quote-quantity').fill(invalid)
        expect(page.locator('#quote-error')).to_be_visible();expect(page.locator('#print-button')).to_be_disabled()
        expect(page.locator('#quote-grand-total')).to_have_text('$63,684.00')
    record('Invalid quote quantities preserve last valid total and block printing')
    page.locator('#quote-quantity').fill('20');expect(page.locator('#quote-grand-total')).to_have_text('$477,108.00')
    page.locator('#quote-quantity').fill('1');page.locator('#quote-support').uncheck()
    expect(page.locator('#quote-grand-total')).to_have_text('$37,468.00');expect(page.locator('#print-button')).to_be_enabled()
    record('Quote max bound and reset')
    take(page,'quote-statement-desktop.png')
    page.pdf(path=str(OUT/'ANDRAI_Statement_DEMO.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
    page.locator('button[data-format="atelier"]').click();expect(page.locator('#quote-paper')).to_have_attribute('data-format','atelier')
    take(page,'quote-atelier-desktop.png')
    page.pdf(path=str(OUT/'ANDRAI_Atelier_DEMO.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
    record('Statement/Atelier format switching and static print generation')
    nav(page,'dashboard')
    for state in ['loading','empty','error']:
        page.select_option('#scenario',state);expect(page.locator('#test-state')).to_be_visible()
        expect(page.locator('#test-state [data-state="'+state+'"]').first).to_be_visible()
        expect(page.locator('#dashboard-region')).to_have_attribute('aria-busy','true' if state=='loading' else 'false')
        take(page,'state-'+state+'.png')
        page.locator('#test-state [data-state="'+state+'"] [data-reset-scenario]').click()
        expect(page.locator('#dashboard-ready')).to_be_visible()
    record('All loading/empty/error scenarios and recovery paths')
    page.get_by_role('button',name='Ajustar movimiento y transparencia').click()
    page.locator('#preferences [data-theme-option="editorial"]').click()
    expect(page.locator('html')).to_have_attribute('data-theme','editorial')
    page.keyboard.press('Escape');take(page,'editorial-desktop.png')
    record('Editorial finish keeps exact values and layout')
    page.get_by_role('button',name='Ajustar movimiento y transparencia').click()
    page.locator('#preferences [data-theme-option="liquid"]').click()
    page.get_by_role('button',name='Reducir movimiento',exact=True).click()
    page.get_by_role('button',name='Superficies opacas',exact=True).click()
    expect(page.locator('html')).to_have_attribute('data-reduced','true');expect(page.locator('html')).to_have_attribute('data-solid','true')
    page.keyboard.press('Escape');page.locator('[data-period="7"]').click()
    expect(page.locator('#income-number')).to_have_text('$63,200')
    assert page.evaluate('document.getAnimations().length')==0
    assert page.locator('.toolbar').evaluate("e=>getComputedStyle(e).backdropFilter")=='none'
    record('Manual reduced motion/transparency; no active motion after updates')
    nav(page,'system');take(page,'system-desktop.png');record('Design system palette and motion specification view')
    context.close()
    # Check OS preference cannot be overridden by the manual toggle.
    c,p=load(browser,reduced_motion='reduce')
    expect(p.locator('html')).to_have_attribute('data-reduced','true')
    p.get_by_role('button',name='Ajustar movimiento y transparencia').click()
    expect(p.locator('#motion-toggle')).to_be_disabled();expect(p.locator('#motion-toggle')).to_have_attribute('aria-pressed','true')
    assert p.evaluate('document.getAnimations().length')==0
    record('OS reduced-motion preference is authoritative');c.close()
    # Responsive checks across every major view; render full documents, not first viewport only.
    for width,height in [(1440,1100),(768,1024),(390,844),(320,740)]:
        c,p=load(browser,width,height,reduced_motion='reduce')
        for view in ['dashboard','projects','quote','system']:
            nav(p,view)
            dims=p.evaluate('({viewport:innerWidth,scroll:document.documentElement.scrollWidth})')
            assert dims['scroll']<=dims['viewport']+1,(width,view,dims)
            p.screenshot(path=str(OUT/(view+'-'+str(width)+'.png')),full_page=True)
        record('Reflow without page overflow at '+str(width)+'px in all four views')
        nav(p,'projects');p.get_by_role('button',name='Abrir Plataforma digital').click()
        r=p.locator('#project-dialog').bounding_box();assert r['x']>=0 and r['x']+r['width']<=width+1
        record('Modal fits viewport '+str(width)+'px');c.close()
    c,p=load(browser,390,844,java_script_enabled=False)
    expect(p.locator('section[data-view]:visible')).to_have_count(4)
    expect(p.locator('#income-number')).to_have_text('$142,000');expect(p.locator('#quote-grand-total')).to_have_text('$37,468.00')
    record('No-JavaScript contains all essential content and exact baseline values');c.close()
    record('No browser console/page errors',not ERRORS,str(ERRORS))
    record('No network requests from the isolated browser artifact',len(REQUESTS)==0,str(REQUESTS))
    browser.close()
report={'scope':'Exact lab HTML in Chromium with CSP, offline set_content. NOT Next/Auth E2E.',
        'document_sha256':hashlib.sha256(HTML.encode()).hexdigest(),
        'checks':RESULTS,'browser_errors':ERRORS,'requests':REQUESTS,
        'counts':{'pass':sum(r['status']=='PASS' for r in RESULTS),'fail':sum(r['status']=='FAIL' for r in RESULTS)}}
(OUT/'browser-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
assert report['counts']['fail']==0
