import base64,re,pathlib
# Source JS/CSS duy nhất nằm ở ../demo-src ; assets (ảnh/logo) nằm ở ./assets
src=pathlib.Path('../demo-src')
assets=pathlib.Path('assets')
b64=lambda p:base64.b64encode((assets/p).read_bytes()).decode()
css=(src/'styles.css').read_text(encoding='utf-8')
js='\n'.join((src/f).read_text(encoding='utf-8') for f in ['i18n.js','realsn.js','data.js','charts.js','core.js','home.js','tickets.js','detail.js','more.js','admin.js','catalog.js','integrations.js','storage.js','registry.js','support.js','erp-i18n.js','erpdata.js','erp.js','erp-intake.js','erp-handover.js'])
A_LOGO=b64('logo.svg'); A_LOGO_DARK=b64('logo-dark.svg'); A_LOGO_WHITE=b64('logo-white.svg'); A_BG=b64('bg.jpg'); A_FAVICON=b64('favicon.png')
boot=f"""
const ASSETS={{logo:'data:image/svg+xml;base64,{A_LOGO}',logoDark:'data:image/svg+xml;base64,{A_LOGO_DARK}',logoWhite:'data:image/svg+xml;base64,{A_LOGO_WHITE}',bg:'data:image/jpeg;base64,{A_BG}'}};
document.documentElement.style.setProperty('--logo','url('+ASSETS.logo+')');
document.documentElement.style.setProperty('--logo-dark','url('+ASSETS.logoDark+')');
document.documentElement.style.setProperty('--bg-img','url('+ASSETS.bg+')');
const REGISTRY_B64='';
loadState(); wire(); render(); loadRegistry();
"""
body=f"""<title>SGE Customer Care</title>
<link rel="icon" type="image/png" href="data:image/png;base64,{A_FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=IBM+Plex+Mono:wght@500&display=swap">
<style>{css}</style>
<div id="root"></div>
<script>
{js}
{boot}
</script>
"""
pathlib.Path('dist').mkdir(exist_ok=True)
pathlib.Path('dist/artifact.html').write_text(body,encoding='utf-8')
full=f"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{body.split('<div id="root">')[0]}</head><body><div id="root"></div>
<script>
{js}
{boot}
</script></body></html>"""
pathlib.Path('dist/SGE-AfterSales-Demo.html').write_text(full,encoding='utf-8')
print('ok', len(body)//1024,'KB')
