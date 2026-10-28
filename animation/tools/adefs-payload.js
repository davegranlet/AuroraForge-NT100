'use strict';

// Sequential version-1 ADefs grammar, evidenced by the native 273 fixtures and
// independent DEF_FULL exports. Unknown variants fail closed. Offsets below are
// evidence locations, never guessed relocation pointers. u64 values stay strings.
function parsePayload(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > 64 * 1024 * 1024) throw Error('Invalid ADefs payload size');
  let p = 0;
  const spans = [], strings = [];
  function read(n, kind, fn) {
    if (p + n > buffer.length) throw Error(`Truncated ${kind} at ${p}`);
    const start = p; p += n;
    const value = fn(start);
    spans.push({ start, end: p, kind, value });
    return value;
  }
  const u8 = kind => read(1, kind, i => buffer[i]);
  const u16 = kind => read(2, kind, i => buffer.readUInt16LE(i));
  const u32 = kind => read(4, kind, i => buffer.readUInt32LE(i));
  const i32 = kind => read(4, kind, i => buffer.readInt32LE(i));
  const u64 = kind => read(8, kind, i => buffer.readBigUInt64LE(i).toString());
  const f32 = kind => read(4, kind, i => { const v = buffer.readFloatLE(i); if (!Number.isFinite(v)) throw Error(`Nonfinite ${kind} at ${i}`); return v; });
  function tag(expected) {
    const at = p, actual = read(4, 'tag', i => buffer.toString('ascii', i, i + 4));
    if (actual !== expected) throw Error(`Expected ${expected} at ${at}, found ${JSON.stringify(actual)}`);
  }
  function count(kind, max = 100000) { const n = u32(kind); if (n > max) throw Error(`Invalid ${kind}: ${n}`); return n; }
  function zero(kind) { if (u32(kind) !== 0) throw Error(`Unsupported nonzero ${kind} at ${p - 4}`); }
  function bool(kind) { const v = u8(kind); if (v > 1) throw Error(`Invalid boolean ${kind} at ${p - 1}`); return !!v; }
  function string(kind) {
    const lengthOffset = p, n = count(`${kind}.length`, 1024 * 1024);
    if (n < 1) throw Error(`Empty string storage at ${lengthOffset}`);
    const start = p;
    const value = read(n, kind, i => {
      if (buffer[i + n - 1] !== 0 || buffer.subarray(i, i + n - 1).includes(0)) throw Error(`Invalid terminated string at ${i}`);
      return buffer.toString('utf8', i, i + n - 1);
    });
    if (!Buffer.from(value, 'utf8').equals(buffer.subarray(start, start + n - 1))) throw Error(`Invalid UTF-8 at ${start}`);
    strings.push({ lengthOffset, start, end: p, value, kind });
    return value;
  }
  const stateTypes = {3746237326:'string',2798691563:'bool',2834993934:'bool',1736598667:'bool',1187038911:'bool',1623236036:'bool',1566908143:'bool',1294229291:'bool'};
  const nodeTypes = {3746237326:'u64',3196319741:'string',2654933132:'string',170801908:'bool',2027243719:'u32',3367119876:'f32',429398639:'f32',1285033423:'f32'};
  const dttTypes = {2330168062:'u32',1699119341:'u32',205488698:'bool',1167662337:'string'};
  function kv(types, kind) {
    tag('__vk'); const n = count(`${kind}.count`, 256), out = {};
    Object.defineProperty(out, '__fieldOrder', { value: [], enumerable: false });
    for (let i = 0; i < n; i++) {
      const key = read(4, `${kind}.key`, i => buffer.readUInt32BE(i)), type = types[key];
      if (!type || Object.hasOwn(out, key)) throw Error(`Unsupported/duplicate ${kind} key ${key} at ${p - 4}`);
      out.__fieldOrder.push(String(key));
      const label = `${kind}.${key}`;
      out[key] = ({string, bool, u64, u32, f32})[type](label);
    }
    return out;
  }
  tag('epyt'); const version = u32('version');
  if (version !== 1) throw Error(`Unsupported ADefs payload version ${version}`);
  tag('sgra'); const argumentsCount = count('argumentCount', 65536), args = [];
  for (let i = 0; i < argumentsCount; i++) {
    const start = p, guid = u64(`argument[${i}].guid`), type = u8(`argument[${i}].type`);
    const readers = {1:bool,2:i32,3:f32,4:string,5:u64};
    if (!readers[type]) throw Error(`Unsupported argument type ${type} at ${p - 1}`);
    const value = readers[type](`argument[${i}].value`);
    args.push({start,end:p,guid,type,value});
  }
  const catalogEnd = p;
  tag('feda'); const definitionCount = count('definitionCount', 10000), definitions = [];
  for (let d = 0; d < definitionCount; d++) {
    tag('tats'); const stateCount = count('stateCount', 1000), states = [];
    for (let s = 0; s < stateCount; s++) {
      const fields = kv(stateTypes, 'state');
      tag('cnys'); zero('sync.dataCount'); const syncGlobal = u64('sync.global');
      tag('_ttd'); const dttCount = count('dtt.count', 100); const dtt = [];
      for (let j = 0; j < dttCount; j++) dtt.push(kv(dttTypes, 'dtt'));
      tag('rvot'); zero('tovr.count');
      tag('edon'); const nodeType = u32('node.type');
      if (nodeType !== 1) throw Error(`Unsupported node type ${nodeType} at ${p - 4}`);
      const nodeFlag = bool('node.flag'), node = kv(nodeTypes, 'node');
      tag('csed'); zero('desc.count');
      tag('tnve'); const eventCount = count('eventCount', 10000), events = [];
      for (let j = 0; j < eventCount; j++) {
        const guid = u64('event.guid'), value1 = u32('event.value1'), flag = bool('event.flag');
        const value2 = u32('event.value2'), value3 = u64('event.value3');
        tag('girt'); const triggerCount = count('triggerCount', 1000), triggers = [];
        for (let k = 0; k < triggerCount; k++) triggers.push({hash:u64('trigger.hash'),value:f32('trigger.value')});
        tag('sgra'); const n = count('event.argumentCount', 65536), argumentIndices = [];
        for (let k = 0; k < n; k++) { const index = u16('event.argumentIndex'); if (index >= args.length) throw Error(`Argument index ${index} out of range`); argumentIndices.push(index); }
        events.push({guid,value1,flag,value2,value3,triggers,argumentIndices});
      }
      states.push({fields,syncGlobal,dtt,nodeType,nodeFlag,node,events});
    }
    tag('_prg'); zero('group.count'); definitions.push({states});
  }
  if (p !== buffer.length) throw Error(`ADefs trailing bytes at ${p} of ${buffer.length}`);
  return {schema:'aurora-adefs-payload/v1',version,bytes:p,catalogEnd,arguments:args,definitions,spans,strings};
}

// Editing only proven sequential string values preserves every other byte.
// No pointer sweep, graph rebuild, or opaque-field serialization is performed.
function renameIdentity(buffer, from, to) {
  if (!/^\d+$/.test(from) || !/^\d+$/.test(to)) throw Error('Identity must contain decimal digits');
  const parsed = parsePayload(buffer), edits = [];
  for (const field of parsed.strings) {
    const value = field.value.replace(new RegExp(`(^|[^0-9])${from}(?=[^0-9]|$)`, 'g'), (_, prefix) => prefix + to);
    if (value !== field.value) edits.push({...field,replacement:value});
  }
  const parts = []; let cursor = 0;
  for (const edit of edits) {
    const text = Buffer.from(edit.replacement + '\0', 'utf8'), size = Buffer.alloc(4); size.writeUInt32LE(text.length);
    parts.push(buffer.subarray(cursor,edit.lengthOffset),size,text); cursor = edit.end;
  }
  parts.push(buffer.subarray(cursor)); const output = Buffer.concat(parts);
  parsePayload(output);
  return {output,edits};
}
function rescaleFrameTimes(buffer,newEnd){
  const parsed=parsePayload(buffer);
  const ends=parsed.spans.filter(s=>s.kind==='node.2027243719');
  if(!ends.length)throw Error('No ADefs node end frame found');
  const oldEnd=Math.max(...ends.map(s=>s.value));
  if(!Number.isInteger(newEnd)||newEnd<oldEnd)throw Error(`Invalid new ADefs end frame ${newEnd}; old end is ${oldEnd}`);
  const out=Buffer.from(buffer),ratio=newEnd/oldEnd;
  for(const s of parsed.spans.filter(s=>s.kind==='trigger.value')){
    const value=s.value*ratio;
    if(!Number.isFinite(value)||value<0||value>newEnd+1e-3)throw Error(`Rescaled trigger out of range at ${s.start}`);
    out.writeFloatLE(value,s.start);
  }
  for(const s of ends)out.writeUInt32LE(newEnd,s.start);
  const check=parsePayload(out);
  const maxTrigger=Math.max(...check.spans.filter(s=>s.kind==='trigger.value').map(s=>s.value));
  if(maxTrigger>newEnd+1e-3)throw Error('Rescaled ADefs trigger exceeds node end');
  return {output:out,oldEnd,newEnd,definitions:check.definitions.length,triggers:check.spans.filter(s=>s.kind==='trigger.value').length,maxTrigger};
}

// Serialize the complete measured sequential grammar. This deliberately accepts
// only the semantic object returned by parsePayload (or an equivalent object
// using the same typed fields); callers cannot inject opaque bytes or unknown
// tags. The exact round-trip tests are the gate for using this as an authoring
// foundation.
function serializePayload(model) {
  if (!model || model.schema !== 'aurora-adefs-payload/v1' || model.version !== 1
      || !Array.isArray(model.arguments) || !Array.isArray(model.definitions)) {
    throw Error('Expected a parsed Aurora ADefs version-1 payload');
  }
  const chunks = [];
  const push = value => chunks.push(value);
  const tag = value => { if (!/^[\x20-\x7e]{4}$/.test(value)) throw Error(`Invalid tag ${value}`); push(Buffer.from(value, 'ascii')); };
  const integer = (value, bytes, label, signed = false) => {
    if (!Number.isInteger(value)) throw Error(`Invalid ${label}`);
    const b = Buffer.alloc(bytes);
    if (bytes === 1) signed ? b.writeInt8(value) : b.writeUInt8(value);
    else if (bytes === 2) signed ? b.writeInt16LE(value) : b.writeUInt16LE(value);
    else if (bytes === 4) signed ? b.writeInt32LE(value) : b.writeUInt32LE(value);
    else throw Error(`Unsupported integer width for ${label}`);
    push(b);
  };
  const u32 = (value, label) => integer(value, 4, label);
  const u64 = (value, label) => {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw Error(`Invalid ${label}`);
    const n = BigInt(value);
    if (n > 0xffffffffffffffffn) throw Error(`Out-of-range ${label}`);
    const b = Buffer.alloc(8); b.writeBigUInt64LE(n); push(b);
  };
  const bool = (value, label) => {
    if (typeof value !== 'boolean') throw Error(`Invalid ${label}`);
    integer(value ? 1 : 0, 1, label);
  };
  const f32 = (value, label) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(`Invalid ${label}`);
    const b = Buffer.alloc(4); b.writeFloatLE(value); push(b);
  };
  const string = (value, label) => {
    if (typeof value !== 'string' || value.includes('\0')) throw Error(`Invalid ${label}`);
    const bytes = Buffer.from(value + '\0', 'utf8'); u32(bytes.length, `${label}.length`); push(bytes);
  };
  const types = {
    state: {3746237326:'string',2798691563:'bool',2834993934:'bool',1736598667:'bool',1187038911:'bool',1623236036:'bool',1566908143:'bool',1294229291:'bool'},
    node: {3746237326:'u64',3196319741:'string',2654933132:'string',170801908:'bool',2027243719:'u32',3367119876:'f32',429398639:'f32',1285033423:'f32'},
    dtt: {2330168062:'u32',1699119341:'u32',205488698:'bool',1167662337:'string'},
  };
  const typedValue = (kind, value, label) => {
    if (kind === 'string') string(value, label);
    else if (kind === 'bool') bool(value, label);
    else if (kind === 'u64') u64(value, label);
    else if (kind === 'u32') u32(value, label);
    else if (kind === 'f32') f32(value, label);
    else throw Error(`Unsupported ${label} type ${kind}`);
  };
  const kv = (values, schema, label) => {
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw Error(`Invalid ${label}`);
    const order = Array.isArray(values.__fieldOrder) ? values.__fieldOrder : Object.keys(values);
    const keys = [...order, ...Object.keys(values).filter(key => !order.includes(key))];
    const entries = keys.filter(key => Object.hasOwn(values, key)).map(key => [key, values[key]]);
    if (entries.length > 256) throw Error(`Too many ${label} fields`);
    tag('__vk'); u32(entries.length, `${label}.count`);
    for (const [key, value] of entries) {
      if (!/^\d+$/.test(key) || !Object.hasOwn(schema, key)) throw Error(`Unsupported ${label} key ${key}`);
      const b = Buffer.alloc(4); b.writeUInt32BE(Number(key)); push(b);
      typedValue(schema[key], value, `${label}.${key}`);
    }
  };
  const zero = label => u32(0, label);

  tag('epyt'); u32(model.version, 'version');
  tag('sgra'); u32(model.arguments.length, 'argumentCount');
  const argWriters = {1: value => bool(value,'argument.bool'), 2: value => integer(value,4,'argument.i32',true), 3: value => f32(value,'argument.f32'), 4: value => string(value,'argument.string'), 5: value => u64(value,'argument.u64')};
  for (const [i, arg] of model.arguments.entries()) {
    u64(arg.guid, `argument[${i}].guid`);
    if (!argWriters[arg.type]) throw Error(`Unsupported argument type ${arg.type}`);
    integer(arg.type,1,`argument[${i}].type`); argWriters[arg.type](arg.value);
  }
  tag('feda'); u32(model.definitions.length, 'definitionCount');
  for (const [di, definition] of model.definitions.entries()) {
    if (!Array.isArray(definition.states)) throw Error(`Invalid definition[${di}].states`);
    tag('tats'); u32(definition.states.length, `definition[${di}].stateCount`);
    for (const [si, state] of definition.states.entries()) {
      const prefix = `definition[${di}].state[${si}]`;
      kv(state.fields, types.state, `${prefix}.fields`);
      tag('cnys'); zero(`${prefix}.sync.dataCount`); u64(state.syncGlobal, `${prefix}.sync.global`);
      tag('_ttd');
      if (!Array.isArray(state.dtt) || state.dtt.length > 100) throw Error(`Invalid ${prefix}.dtt`);
      u32(state.dtt.length, `${prefix}.dtt.count`);
      for (const [j, item] of state.dtt.entries()) kv(item, types.dtt, `${prefix}.dtt[${j}]`);
      tag('rvot'); zero(`${prefix}.tovr.count`);
      tag('edon'); u32(state.nodeType, `${prefix}.node.type`); bool(state.nodeFlag, `${prefix}.node.flag`); kv(state.node, types.node, `${prefix}.node`);
      tag('csed'); zero(`${prefix}.desc.count`);
      tag('tnve');
      if (!Array.isArray(state.events) || state.events.length > 10000) throw Error(`Invalid ${prefix}.events`);
      u32(state.events.length, `${prefix}.eventCount`);
      for (const [ei, event] of state.events.entries()) {
        const ep = `${prefix}.event[${ei}]`;
        u64(event.guid, `${ep}.guid`); u32(event.value1, `${ep}.value1`); bool(event.flag, `${ep}.flag`); u32(event.value2, `${ep}.value2`); u64(event.value3, `${ep}.value3`);
        tag('girt');
        if (!Array.isArray(event.triggers) || event.triggers.length > 1000) throw Error(`Invalid ${ep}.triggers`);
        u32(event.triggers.length, `${ep}.triggerCount`);
        for (const [ti, trigger] of event.triggers.entries()) { u64(trigger.hash, `${ep}.trigger[${ti}].hash`); f32(trigger.value, `${ep}.trigger[${ti}].value`); }
        tag('sgra');
        if (!Array.isArray(event.argumentIndices) || event.argumentIndices.length > 65536) throw Error(`Invalid ${ep}.argumentIndices`);
        u32(event.argumentIndices.length, `${ep}.argumentCount`);
        for (const index of event.argumentIndices) integer(index,2,`${ep}.argumentIndex`);
      }
    }
    tag('_prg'); zero(`definition[${di}].group.count`);
  }
  const output = Buffer.concat(chunks);
  const check = parsePayload(output);
  if (check.bytes !== output.length) throw Error('Serialized ADefs payload failed size validation');
  return output;
}

module.exports = {parsePayload,renameIdentity,rescaleFrameTimes,serializePayload};
