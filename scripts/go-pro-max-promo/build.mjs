// Build local drafts only. No authentication, network, or publication.
import {writeFile} from 'node:fs/promises';
import {document,renderDescription,renderFields,fields,nativeDescription} from '../../courses/305734-go-pro-max/promo/content.mjs';
const folder='courses/305734-go-pro-max/promo';
await writeFile(folder+'/index.html',document('Описание курса',renderDescription(),'promo'));
await writeFile(folder+'/fields.html',renderFields());
await writeFile(folder+'/embed.html',document('Описание курса',renderDescription(),'promo').replace(/<header class="preview-bar">[\s\S]*?<\/header>/,'').replace('<body>','<body class="embedded">'));
const htmlFields=Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,['target_audience','requirements','learning_format'].includes(key)?value.map(text=>'<p>'+text+'</p>').join(''):value]));
await writeFile(folder+'/course-fields.json',JSON.stringify({...htmlFields,description:nativeDescription()},null,2));
console.log('Go Pro MAX description: local preview built. Stepik unchanged.');
