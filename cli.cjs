#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {parseArgs} = require('node:util');
const {auditFiles, MAX_ENTRIES} = require('./index.cjs');
try {
  const {values, positionals} = parseArgs({allowPositionals:true, options:{help:{type:'boolean',short:'h'},'max-file-mib':{type:'string'},'max-total-mib':{type:'string'}}});
  if (values.help) {
    console.log('Usage: figment-site-check <folder> [--max-file-mib 20] [--max-total-mib 50]\nReads file names and sizes only. Outputs JSON. Exit 0: no errors; 1: audit errors; 2: invalid input.');
  } else {
    if (positionals.length !== 1) throw new Error('Pass one website folder. Use --help.');
    const root = path.resolve(positionals[0]);
    if (!fs.statSync(root).isDirectory()) throw new Error('The input must be a directory.');
    const entries = [];
    let visited = 0;
    function walk(dir, prefix = '', depth = 0) {
      if (depth > 100) throw new Error('Folder nesting exceeds 100 levels.');
      for (const entry of fs.readdirSync(dir, {withFileTypes:true}).sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
        if (++visited > MAX_ENTRIES) throw new Error('Folder contains more than 10000 entries. Select the built website folder.');
        const name = prefix + entry.name;
        const full = path.join(dir, entry.name);
        if (entry.isSymbolicLink()) entries.push({path:name,size:0,kind:'symlink'});
        else if (entry.isDirectory()) {
          if (['.git','.svn','.hg','node_modules'].includes(entry.name)) entries.push({path:name,size:0});
          else walk(full, name + '/', depth + 1);
        } else if (entry.isFile()) entries.push({path:name,size:fs.lstatSync(full).size});
        else throw new Error(`Unsupported file type: ${name}`);
      }
    }
    walk(root);
    const options = {};
    if (values['max-file-mib'] !== undefined) options.maxFileBytes = Number(values['max-file-mib']) * 1048576;
    if (values['max-total-mib'] !== undefined) options.maxTotalBytes = Number(values['max-total-mib']) * 1048576;
    const result = auditFiles(entries, options);
    console.log(JSON.stringify(result,null,2));
    process.exitCode = result.ok ? 0 : 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
