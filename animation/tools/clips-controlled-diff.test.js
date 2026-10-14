'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {diffRanges}=require('./clips-controlled-diff');
test('reports compact changed byte runs',()=>assert.deepEqual(diffRanges(Buffer.from([1,2,3,4,5]),Buffer.from([1,9,8,4,7]),),[{start:1,end:3,length:2},{start:4,end:5,length:1}]));
