// Check the actual Python grader, including Stepik's stdout normalization.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const plan=JSON.parse(await readFile('.local-publication/loops.json','utf8'));
const graders=plan.articles.filter(a=>a.block.name==='code').map(a=>({position:a.position,code:a.block.source.code}));
const program=`import json, sys
checks = 0
for item in json.load(sys.stdin):
    scope = {}
    exec(item['code'], scope)
    tests = scope['generate']()
    for dataset, expected in tests:
        assert scope['solve'](dataset) == expected
        assert scope['check'](expected, expected), item['position']
        assert scope['check'](expected.strip(), expected), item['position']
        assert scope['check'](expected.replace('\\n', '\\r\\n'), expected)
        assert not scope['check']('Неверный ответ, которого нет в данных', expected)
        checks += 5
print(json.dumps({'graders': 10, 'cases': 134, 'checks': checks}))
`;
const result=spawnSync('/usr/bin/python3',['-c',program],{input:JSON.stringify(graders),encoding:'utf8',timeout:10000,maxBuffer:100000});
assert.equal(result.status,0,result.stderr);console.log(result.stdout.trim());
