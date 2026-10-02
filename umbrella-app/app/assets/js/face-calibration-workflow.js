(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function previewImage(fileInput, previewWrapId) {
    const previewWrap = byId(previewWrapId);
    if (!previewWrap) return;
    const img = previewWrap.querySelector('img');
    const placeholder = previewWrap.querySelector('.placeholder');
    const file = fileInput && fileInput.files && fileInput.files[0];

    if (!file) {
      if (img) {
        img.removeAttribute('src');
        img.style.display = 'none';
      }
      if (placeholder) placeholder.style.display = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      if (img) {
        img.src = event.target.result;
        img.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function collectIssueNotes() {
    const boxes = Array.from(document.querySelectorAll('#faceCalibrationIssues input[type="checkbox"]:checked'));
    return boxes.map((box) => {
      const label = box.closest('label');
      const title = label ? label.textContent.trim() : 'Issue';
      return {
        title,
        note: box.getAttribute('data-note') || ''
      };
    });
  }

  function buildOutputText() {
    const profile = byId('faceCalProfile') ? byId('faceCalProfile').value : 'Slade';
    const severity = byId('faceCalSeverity') ? byId('faceCalSeverity').value : 'moderate';
    const goal = byId('faceCalGoal') ? byId('faceCalGoal').value : 'better placement';
    const modelNotes = byId('faceCalModelNotes') ? byId('faceCalModelNotes').value.trim() : '';
    const extraNotes = byId('faceCalExtraNotes') ? byId('faceCalExtraNotes').value.trim() : '';
    const issues = collectIssueNotes();

    const lines = [];
    lines.push('AuroraForge NT100 — Face Calibration + In-Game Correction Notes');
    lines.push('');
    lines.push('Working profile: ' + profile);
    lines.push('Correction strength: ' + severity);
    lines.push('Primary next-pass goal: ' + goal);
    lines.push('');
    lines.push('Summary:');
    if (issues.length) {
      lines.push('The face is landing in the general front-face region, but the following issues need correction on the next pass:');
      issues.forEach((issue) => lines.push('- ' + issue.title));
    } else {
      lines.push('No checklist issues were selected. Add notes below or use this page again after another test.');
    }

    if (modelNotes) {
      lines.push('');
      lines.push('Model / test notes:');
      lines.push(modelNotes);
    }

    if (extraNotes) {
      lines.push('');
      lines.push('Additional observations:');
      lines.push(extraNotes);
    }

    if (issues.length) {
      lines.push('');
      lines.push('Correction instructions for the next face pass:');
      issues.forEach((issue) => lines.push('- ' + issue.note));
    }

    lines.push('');
    lines.push('Recommended next-pass prompt notes:');
    lines.push('- Keep the face texture useful for in-game placement, not as a poster portrait.');
    lines.push('- Use neutral, front-facing texture lighting with no dramatic cinematic shadowing.');
    lines.push('- Keep details readable at WWE 2K camera distance and after DDS conversion.');
    lines.push('- Match the face texture more closely to the intended body skin tone.');
    lines.push('- Orientation / export reminder: keep the editable working PNG unflipped, then vertically flip the final game-test copy before DDS conversion unless a specific face item proves otherwise.');
    if (issues.length) {
      lines.push('- Apply the correction instructions above as the source-of-truth for the next revision.');
    }

    lines.push('');
    lines.push('Next workflow:');
    lines.push('Source texture -> revised texture prep -> DDS conversion -> in-game test -> compare again if needed.');

    return lines.join('\n');
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      anchor.remove();
    }, 0);
  }

  function resetForm() {
    const ids = ['faceCalSourceFile', 'faceCalResultFile', 'faceCalModelNotes', 'faceCalExtraNotes', 'faceCalibrationOutput'];
    ids.forEach((id) => {
      const el = byId(id);
      if (!el) return;
      if (el.type === 'file') {
        el.value = '';
      } else {
        el.value = '';
      }
    });

    Array.from(document.querySelectorAll('#faceCalibrationIssues input[type="checkbox"]')).forEach((box) => {
      box.checked = false;
    });

    const previewIds = ['faceCalSourcePreview', 'faceCalResultPreview'];
    previewIds.forEach((id) => {
      const wrap = byId(id);
      if (!wrap) return;
      const img = wrap.querySelector('img');
      const placeholder = wrap.querySelector('.placeholder');
      if (img) {
        img.removeAttribute('src');
        img.style.display = 'none';
      }
      if (placeholder) placeholder.style.display = '';
    });

    if (byId('faceCalProfile')) byId('faceCalProfile').value = 'Slade';
    if (byId('faceCalSeverity')) byId('faceCalSeverity').value = 'moderate';
    if (byId('faceCalGoal')) byId('faceCalGoal').value = 'better placement';
  }

  function init() {
    const sourceFile = byId('faceCalSourceFile');
    const resultFile = byId('faceCalResultFile');
    const generateBtn = byId('generateFaceCalibrationBtn');
    const copyBtn = byId('copyFaceCalibrationBtn');
    const downloadBtn = byId('downloadFaceCalibrationBtn');
    const resetBtn = byId('resetFaceCalibrationBtn');
    const output = byId('faceCalibrationOutput');

    if (sourceFile) {
      sourceFile.addEventListener('change', function () {
        previewImage(sourceFile, 'faceCalSourcePreview');
      });
    }
    if (resultFile) {
      resultFile.addEventListener('change', function () {
        previewImage(resultFile, 'faceCalResultPreview');
      });
    }
    if (generateBtn) {
      generateBtn.addEventListener('click', function () {
        if (output) output.value = buildOutputText();
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', async function () {
        if (!output || !output.value.trim()) {
          output.value = buildOutputText();
        }
        try {
          await navigator.clipboard.writeText(output.value);
          copyBtn.textContent = 'Copied';
          setTimeout(function () {
            copyBtn.textContent = 'Copy Notes';
          }, 1300);
        } catch (error) {
          console.warn('Clipboard copy failed:', error);
        }
      });
    }
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!output || !output.value.trim()) {
          output.value = buildOutputText();
        }
        downloadText('face-calibration-notes.txt', output.value);
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', resetForm);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
