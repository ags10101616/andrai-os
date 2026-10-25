/** Local renderer of the EXACT isolated lab modules. Not an Auth/Next E2E substitute. */
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
const dir=await mkdtemp(join(tmpdir(),'andrai-os15-'));
const source=resolve('src/lib/lab');
for(const file of await readdir(source)){
 if(!file.endsWith('.ts'))continue;
 const text=await readFile(join(source,file),'utf8');
 const result=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}});
 const output=result.outputText.replace(/from ['"]\.\/([^'"]+)['"]/g,(_,name)=>"from './"+name+".mjs'");
 await writeFile(join(dir,file.replace(/\.ts$/,'.mjs')),output);
}
const {labDocument}=await import(pathToFileURL(join(dir,'document.mjs')).href);
const {labRuntime}=await import(pathToFileURL(join(dir,'runtime.mjs')).href);
const {createLabResponse}=await import(pathToFileURL(join(dir,'access.mjs')).href);
if(process.env.OS15_EXPORT_PATH)await writeFile(process.env.OS15_EXPORT_PATH,labDocument);
const port=Number(process.env.PORT||4173);
const server=createServer(async(req,res)=>{
 if(new URL(req.url,'http://localhost').pathname!='/laboratorio'){res.writeHead(404);res.end('Not found');return;}
 const response=createLabResponse(labDocument,labRuntime,{nodeEnv:'development'});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
});
server.listen(port,'127.0.0.1',()=>console.log('OS15 isolated lab: http://127.0.0.1:'+port+'/laboratorio'));
