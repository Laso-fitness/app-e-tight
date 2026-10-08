import {mkdir,cp,readdir} from 'node:fs/promises';
await mkdir('public/pilot',{recursive:true});
for(const name of ['index.html','blue-marvel.html','_headers'])await cp(name,'public/'+name);
for(const name of await readdir('pilot'))if(/\.(html|js|css|svg|png|json)$/.test(name))await cp('pilot/'+name,'public/pilot/'+name);
