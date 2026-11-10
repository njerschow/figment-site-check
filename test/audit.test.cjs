const {test} = require('node:test');
const assert = require('node:assert/strict');
const {auditFiles} = require('../index.cjs');
for (const c of require('./cases.json')) test(c.name, () => {
  const r = auditFiles(c.files, c.options);
  assert.deepEqual(r.issues.map(i => i.code), c.codes);
  assert.equal(r.ok, c.ok);
});
test('reject malformed inputs', () => {
  for (const v of [null, {}, [null], [{path:'a',size:-1}], [{path:'a',size:1.5}], [{path:'a',size:true}], [{path:'a',size:NaN}], [{path:'a',size:0,kind:'directory'}]]) assert.throws(() => auditFiles(v));
});
test('reject invalid limits and too many entries', () => {
  for (const v of [0,-1,NaN,Infinity,1.5,'10']) assert.throws(() => auditFiles([],{maxFileBytes:v}));
  assert.throws(() => auditFiles(Array(10001).fill({path:'x',size:0})));
});
test('does not modify caller data', () => {
  const files = Object.freeze([Object.freeze({path:'index.html',size:3})]);
  assert.equal(auditFiles(files,Object.freeze({maxFileBytes:3})).ok,true);
});
