const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const python = process.env.PYTHON || 'python3';
const commands = [[process.execPath,[path.join(root,'cli.cjs')]], [python,['-m','figment_site_check']]];
test('CLI parity: clean, unsafe, symlink, limits, bad input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'figment-check-test-'));
  const run = args => commands.map(([cmd,prefix]) => spawnSync(cmd,[...prefix,...args],{encoding:'utf8',env:{...process.env,PYTHONPATH:path.join(root,'src')}}));
  try {
    fs.writeFileSync(path.join(dir,'index.html'), '<h1>Example</h1>');
    let results = run([dir]);
    for (const result of results) assert.equal(result.status,0,result.stderr);
    assert.deepEqual(JSON.parse(results[0].stdout),JSON.parse(results[1].stdout));
    fs.mkdirSync(path.join(dir,'.git'));
    fs.writeFileSync(path.join(dir,'.git','ignored-test-file'), 'not read');
    fs.symlinkSync(os.tmpdir(),path.join(dir,'outside'));
    results = run([dir]);
    for (const result of results) assert.equal(result.status,1,result.stderr);
    const a = JSON.parse(results[0].stdout);
    assert.deepEqual(a,JSON.parse(results[1].stdout));
    assert.deepEqual(a.issues.map(i=>i.code),['sensitive_path','symlink']);
    assert.equal(a.fileCount,3);
    for (const args of [[],[dir,'--max-file-mib','-1'],[dir,'--max-total-mib','nan'],[path.join(dir,'missing')]]) {
      for (const result of run(args)) assert.equal(result.status,2,result.stderr);
    }
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
