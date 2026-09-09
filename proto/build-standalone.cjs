// Build-time only. Output index.html needs no server or adjacent assets.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = __dirname, source = path.join(root,'source');
const routes=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);if(fs.statSync(p).isDirectory())walk(p);else if(name.endsWith('.jsx')&&!name.startsWith('_')&&!name.startsWith('+'))routes.push(p);}}
walk(path.join(source,'app'));
let entry = `import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport Root from './app/_layout';\nimport Auth from './app/(auth)/_layout';\nimport Main from './app/(main)/_layout';\nimport {WithSlot,usePathname} from './standalone-router';\n`;
routes.forEach((p,i)=>entry+=`import Page${i} from ${JSON.stringify('./'+path.relative(source,p))};\n`);
entry+='const pages={'+routes.map((p,i)=>JSON.stringify('/'+path.relative(path.join(source,'app'),p).replace(/\([^/]+\)\//g,'').replace(/\.jsx$/,'').replace(/(^|\/)index$/,''))+':Page'+i).join(',')+'};\n';
entry+=`function App(){const path=usePathname();const Page=pages[path]||pages['/'];const Layout=['/login','/signup','/forgot-password'].includes(path)?Auth:Main;return <WithSlot slot={<WithSlot slot={<Page/>}><Layout/></WithSlot>}><Root/></WithSlot>;}createRoot(document.getElementById('root')).render(<App/>);`;
fs.writeFileSync(path.join(source,'standalone-entry.jsx'),entry);
cp.execFileSync('npm',['exec','--yes','--package=esbuild','--','esbuild','standalone-entry.jsx','--bundle','--format=iife','--platform=browser','--target=es2020','--jsx=automatic','--main-fields=browser,module,main','--resolve-extensions=.web.tsx,.web.ts,.web.jsx,.web.js,.tsx,.ts,.jsx,.js,.json','--alias:react-native=react-native-web','--alias:expo-router=./standalone-router.jsx','--define:process.env.NODE_ENV="production"','--define:__DEV__=false','--loader:.js=jsx','--loader:.png=dataurl','--loader:.jpg=dataurl','--loader:.ttf=dataurl','--tsconfig=jsconfig.json','--outfile=standalone-bundle.js'],{cwd:source,stdio:'inherit'});
const js=fs.readFileSync(path.join(source,'standalone-bundle.js'),'utf8').replace(/<\/script/gi,'<\\/script');
let css=fs.existsSync(path.join(source,'standalone-bundle.css'))?fs.readFileSync(path.join(source,'standalone-bundle.css'),'utf8'):'';
const htmlSource=fs.readFileSync(path.join(source,'app/+html.jsx'),'utf8');
const fontDir = path.join(root,'../ds-bundle/fonts');
css += fs.readFileSync(path.join(fontDir,'fonts.css'),'utf8').replace(/url\(([^)]+)\)/g, (_,name) => {
  const file = path.join(fontDir,name.replace(/["']/g,'').trim());
  return 'url(data:font/woff2;base64,'+fs.readFileSync(file).toString('base64')+')';
});
css += htmlSource.split('const GLOBAL_CSS = `')[1]?.split('`;')[0]||'';
// No external scripts, fonts, stylesheets, API, or DB connections.
fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>덕우전자 AX · 독립 프로토타입</title><style>html,body,#root{height:100%;margin:0}body{overflow:hidden}#root{display:flex}${css}</style></head><body><div id="root"></div><script>var global=globalThis;${js}</script></body></html>`);
console.log('Standalone index.html:',fs.statSync(path.join(root,'index.html')).size,'bytes');
