#!/usr/bin/env node
'use strict';
const fs=require('node:fs'), core=require('./core.cjs');
try {
  const input=JSON.parse(fs.readFileSync(0,'utf8'));
  const result=core.build(input,{all:process.argv.includes('--all')});
  process.stdout.write(JSON.stringify(result));
} catch(error) {console.error(error.message);process.exitCode=1;}
