const {chromium}=require('playwright-core'),fs=require('fs'),{pathToFileURL}=require('url'),path=require('path');
(async()=>{
 const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const p=await b.newPage({viewport:{width:1440,height:960}}), errors=[],requests=[],issues=[];
 p.on('pageerror',e=>errors.push(e.message));
 p.on('request',r=>{if(!r.isNavigationRequest()&&!/^(data|blob):/.test(r.url()))requests.push(r.url())});
 await p.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 await p.getByRole('button',{name:'관리자 샘플 계정 입력',exact:true}).click();
 await p.locator('input').nth(1).fill('wrong');
 await p.getByRole('button',{name:'로그인',exact:true}).click();
 await p.getByText('샘플 아이디 또는 비밀번호가 올바르지 않습니다.',{exact:true}).waitFor();
 await p.getByRole('button',{name:'관리자 샘플 계정 입력',exact:true}).click();
 const first=await p.locator('canvas').evaluate(c=>c.toDataURL());
 await p.waitForTimeout(100);
 if(first===await p.locator('canvas').evaluate(c=>c.toDataURL()))issues.push('animation static');
 await p.screenshot({path:path.join(__dirname,'login-preview.png')});
 await p.getByRole('button',{name:'로그인',exact:true}).click();
 await p.waitForTimeout(700);
 await p.screenshot({path:path.join(__dirname,'home-preview.png')});
 console.log('post-login errors',errors);
 await p.getByRole('link',{name:'보고서',exact:true}).click({timeout:4000});
 if(!p.url().endsWith('#/menu/report'))issues.push('menu click failed');
 const paths=[...fs.readFileSync(path.join(__dirname,'source/src/shared/constants/menu.js'),'utf8').matchAll(/path: '([^']+)'/g)].map(m=>m[1]);
 for(const route of paths){await p.evaluate(r=>location.hash=r,route);await p.waitForTimeout(300);const t=await p.locator('body').innerText();const issue=t.match(/[^\n]*(불러오지 못|샘플 데이터가 준비|오류가 발생)[^\n]*/g);if(issue)issues.push({route,issue});}
 console.log(JSON.stringify({pages:paths.length,errors,requests,issues}));
 await b.close();if(errors.length||requests.length||issues.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
