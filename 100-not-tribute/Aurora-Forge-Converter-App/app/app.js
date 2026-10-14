const $ = id => document.getElementById(id);

let source19 = null;
let fop19 = null;
let referenceActs20 = null;
let referenceEvd20 = null;
let outputRoot = null;
let accessOk = false;

function basename(file) {
  return String(file || '').split(/[\\/]/).pop();
}

function log(text) {
  $('log').insertAdjacentHTML('beforeend', `<p><i></i> ${text}</p>`);
}

function friendlyPatreonMessage(result) {
  if (result?.ok) {
    return 'Patreon tier access verified. Converter tools are unlocked.';
  }
  const code = result?.code || null;
  const reason = result?.reason || '';
  switch (code) {
    case 'tier_not_allowed':
      return 'Your Patreon account is active, but the current tier is not eligible for converter access. Upgrade to the supported tier and try again.';
    case 'email_not_found':
      return 'That email was not found on this Patreon campaign. Use the email address tied to your Patreon pledge.';
    case 'inactive_patron':
      return 'Your Patreon membership is not currently active. Rejoin or fix a declined payment, then try again.';
    case 'rate_limited':
      return 'Too many verification attempts. Please wait a few minutes before trying again.';
    case 'api_error':
      return 'Patreon\'s API returned an error. Please try again in a moment.';
    case 'not_configured':
      return 'The verifier is not configured on the server. Contact Aurora Forge support.';
    case 'bad_request':
      return 'Enter a valid Patreon account email address.';
    default:
      return reason || 'Patreon verification failed. Please check your email and try again.';
  }
}

function setAccess(result) {
  accessOk = Boolean(result?.ok);
  $('access-state').textContent = accessOk ? 'VERIFIED' : 'LOCKED';
  $('access-state').className = accessOk ? 'green' : '';
  $('access-message').textContent = friendlyPatreonMessage(result);
  $('convert').disabled = !accessOk;
}

async function refreshAccess() {
  const status = await window.aurora.patreonStatus();
  if (status.session?.ok) {
    setAccess(status.session);
  } else if (!status.config?.configured) {
    setAccess({ ok: false, code: 'not_configured', reason: `Patreon gate is not configured: ${status.config.missing.join(', ')}` });
  } else {
    setAccess(null);
  }
}

async function pickFile(kind) {
  const configs = {
    source19: {
      filters: [{ name: 'Decoded WWE 2K19 motion body', extensions: ['bin', 'yanm'] }],
      label: 'source-name',
      message: file => `2K19 motion selected: ${basename(file)}`,
      assign: file => { source19 = file; },
    },
    fop19: {
      filters: [{ name: 'WWE 2K19 event 0FOP', extensions: ['0fop', 'fop', 'bin'] }],
      label: 'event-name',
      message: file => `2K19 event selected: ${basename(file)}`,
      assign: file => { fop19 = file; },
    },
    referenceActs20: {
      filters: [{ name: 'WWE 2K20 reference ACTS', extensions: ['acts', 'bin'] }],
      label: 'acts-name',
      message: file => `2K20 reference ACTS selected: ${basename(file)}`,
      assign: file => { referenceActs20 = file; },
    },
    referenceEvd20: {
      filters: [{ name: 'WWE 2K20 reference EVD', extensions: ['evd', 'bin'] }],
      label: 'evd-name',
      message: file => `2K20 reference EVD selected: ${basename(file)}`,
      assign: file => { referenceEvd20 = file; },
    },
  };
  const config = configs[kind];
  const file = await window.aurora.pickFile(config.filters);
  if (!file) return;
  config.assign(file);
  $(config.label).textContent = basename(file);
  log(config.message(file));
}

async function pickOutputRoot() {
  const folder = await window.aurora.pickDirectory();
  if (!folder) return;
  outputRoot = folder;
  $('output-name').textContent = folder;
  log(`Package output root selected: ${folder}`);
}

$('source-btn').onclick = () => pickFile('source19');
$('event-btn').onclick = () => pickFile('fop19');
$('acts-btn').onclick = () => pickFile('referenceActs20');
$('evd-btn').onclick = () => pickFile('referenceEvd20');
$('output-btn').onclick = pickOutputRoot;

const fbxButton = document.createElement('button');
fbxButton.textContent = 'Export 2K19 preview FBX';
fbxButton.onclick = async () => {
  if (!accessOk) return log('Verify Patreon tier access first.');
  if (!source19) return log('Select a decoded WWE 2K19 motion file first.');
  const fbx = await window.aurora.pickFbxSave();
  if (!fbx) return;
  log('Exporting Blender preview FBX...');
  const result = await window.aurora.exportFbx({ source: source19, output: fbx });
  log(result.ok ? 'FBX preview exported successfully.' : `FBX export failed: ${result.err || 'unknown error'}`);
};
$('source-btn').after(fbxButton);

$('verify-access').onclick = async () => {
  const email = $('patreon-email').value;
  $('verify-access').disabled = true;
  $('access-state').textContent = 'CHECKING';
  const result = await window.aurora.verifyPatreon({ email });
  setAccess(result);
  log(friendlyPatreonMessage(result));
  $('verify-access').disabled = false;
};

$('convert').onclick = async () => {
  if (!accessOk) return log('Verify Patreon tier access first.');
  if (!source19) return log('Select the decoded WWE 2K19 motion body first.');
  if (!fop19) return log('Select the WWE 2K19 event 0FOP first.');
  if (!referenceActs20) return log('Select the WWE 2K20 reference ACTS first.');
  if (!referenceEvd20) return log('Select the WWE 2K20 reference EVD first.');
  if (!outputRoot) return log('Choose a package output folder first.');
  $('convert').disabled = true;
  $('convert').textContent = 'Building package...';
  $('log-state').textContent = 'WORKING';
  const result = await window.aurora.buildPackage({
    id: '6100',
    source19,
    fop19,
    referenceActs20,
    referenceEvd20,
    outputRoot,
  });
  if (result.ok) {
    const validation = result.validation;
    $('out-tracks').textContent = String(validation.tracks);
    $('out-bytes').textContent = `${validation.actsBytes.toLocaleString()} / ${validation.evdBytes.toLocaleString()}`;
    $('validation').textContent = 'PASSED';
    $('validation').className = 'green';
    $('log-state').textContent = 'COMPLETE';
    log(`Package complete. ACTS ${validation.actsBytes.toLocaleString()} bytes, EVD ${validation.evdBytes.toLocaleString()} bytes.`);
    log(`Read-back validated ${validation.tracks} tracks / ${validation.records} records and EVD motion ${validation.evdMotionId} at ${validation.outputRoot}.`);
  } else {
    $('log-state').textContent = 'FAILED';
    log((result.err || 'Package build failed').trim());
  }
  $('convert').disabled = !accessOk;
  $('convert').textContent = 'Build 2K20 Package  ->';
};

window.aurora.onLog(text => {
  if (text.trim()) log(text.trim());
});

refreshAccess();
