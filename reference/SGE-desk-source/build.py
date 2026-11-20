import re, base64, os
h=open('base.html',encoding='utf8').read()
css=open('base.css',encoding='utf8').read()+'\n'+open('roles.css',encoding='utf8').read()
js=open('base.js',encoding='utf8').read()
roles=open('roles.js',encoding='utf8').read()
# roles layer must load before the boot lines at the end of base.js
boot_i=js.rindex('\nconst ASSETS=')
js2=js[:boot_i]+'\n'+roles+'\n'+js[boot_i:]
h2=re.sub(r'<style>.*?</style>',lambda m:'<style>'+css+'</style>',h,count=1,flags=re.S)
h2=re.sub(r'<script>.*?</script>',lambda m:'<script>'+js2+'</script>',h2,count=1,flags=re.S)
open('dist.html','w',encoding='utf8').write(h2); print('ok',len(h2))
# ban 1 file duy nhat (anh nhung san) de dang len link online / gui nguoi khac
if os.path.exists('kho-bot.png'):
    uri='data:image/png;base64,'+base64.b64encode(open('kho-bot.png','rb').read()).decode()
    open('dist-online.html','w',encoding='utf8').write(h2.replace("'kho-bot.png'","'"+uri+"'")); print('ok dist-online.html')
