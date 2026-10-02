(() => {
  'use strict';

  const lessons = [
    {
      file: '01-open-settings',
      title: 'Open CakeView settings',
      summary: 'Before browsing game files, make sure CakeView knows where WWE 2K26 and your working folders are located.',
      watch: 'The configuration window and the folder-selection buttons.',
      steps: [
        ['Open Settings.', "Use the settings button from CakeView's main screen."],
        ['Check your folders.', 'Select the WWE 2K26 game directory and your preferred work location.'],
        ['Save and return.', 'Do not continue until the selected locations look correct.']
      ]
    },
    {
      file: '02-browse-archives',
      title: 'Browse the game archives',
      summary: 'Use the archive tree to move from broad game categories into the exact folder that contains the asset you need.',
      watch: 'The folder tree changing as categories are opened and narrowed down.',
      steps: [
        ['Start broad.', 'Choose the archive or game category connected to your job.'],
        ['Open one folder at a time.', 'Follow the tree toward the character, attire, material, or texture.'],
        ['Read before clicking.', 'Confirm the folder and file names before opening anything.']
      ]
    },
    {
      file: '03-find-character-model',
      title: 'Find and open a character model',
      summary: 'Select the model container associated with the character or attire you want to inspect.',
      watch: 'The file selection sequence immediately before the model viewer opens.',
      steps: [
        ['Locate the character folder.', 'Use the slot or character ID to narrow the search.'],
        ['Choose the model file.', 'Select the correct MCD for the base model or attire.'],
        ['Open it read-only first.', 'Inspect the model before exporting or changing anything.']
      ]
    },
    {
      file: '04-view-character-model',
      title: 'Inspect the 3D character model',
      summary: 'CakeView can display the model so you can confirm that you opened the correct character and model section.',
      watch: 'The gray character model displayed in the 3D viewer.',
      steps: [
        ['Wait for the model to load.', 'Large character models may take a moment to appear.'],
        ['Rotate and inspect.', 'Check the front, side, and back before doing other work.'],
        ['Confirm the correct asset.', 'Stop if the model is not the character or attire you expected.']
      ]
    },
    {
      file: '05-open-sdb-editor',
      title: 'Open the SDB Editor',
      summary: 'The SDB Editor is a separate advanced tool. This starter lesson only shows where it opens and what its workspace looks like.',
      watch: 'The SDB Editor window, JSON area, and text-search field.',
      steps: [
        ['Open the editor.', 'Launch the SDB Editor from CakeView.'],
        ['Identify the workspace.', 'Find the JSON area and the search field.'],
        ['Do not guess at edits.', 'Use a task-specific tutorial before changing SDB data.']
      ]
    },
    {
      file: '06-open-ycl-editor',
      title: 'Open the YCL Editor',
      summary: 'This lesson introduces the YCL Editor and demonstrates the file-selection step without changing the file.',
      watch: 'The YCL Editor controls followed by the Open YCL file window.',
      steps: [
        ['Open the YCL Editor.', 'Launch it from the CakeView tool menu.'],
        ['Choose the correct YCL.', 'Use the file window to locate the character or attire file.'],
        ['Inspect before editing.', 'Confirm the file and tree data before using any add or remove controls.']
      ]
    }
  ];

  const video = document.getElementById('cakeview-course-video');
  const tabs = Array.from(document.querySelectorAll('.cakeview-lesson-tab'));
  const prev = document.getElementById('cakeview-prev');
  const next = document.getElementById('cakeview-next');
  let activeIndex = 0;

  function setLesson(index) {
    activeIndex = Math.max(0, Math.min(lessons.length - 1, index));
    const lesson = lessons[activeIndex];
    const number = String(activeIndex + 1).padStart(2, '0');
    video.pause();
    video.poster = `training/cakeview-visual-quick-start/${lesson.file}.jpg`;
    video.src = `training/cakeview-visual-quick-start/${lesson.file}.mp4`;
    video.load();
    document.getElementById('cakeview-now-number').textContent = `LESSON ${number}`;
    document.getElementById('cakeview-now-title').textContent = lesson.title;
    document.getElementById('cakeview-lesson-title').textContent = lesson.title;
    document.getElementById('cakeview-lesson-summary').textContent = lesson.summary;
    document.getElementById('cakeview-watch-for').textContent = lesson.watch;
    document.getElementById('cakeview-lesson-steps').innerHTML = lesson.steps.map(([title, detail]) => `<li><b>${title}</b><span>${detail}</span></li>`).join('');
    tabs.forEach((tab, tabIndex) => tab.classList.toggle('active', tabIndex === activeIndex));
    prev.disabled = activeIndex === 0;
    next.disabled = activeIndex === lessons.length - 1;
    next.textContent = activeIndex === lessons.length - 1 ? 'Starter course complete' : 'Next lesson →';
  }

  tabs.forEach((tab, index) => tab.addEventListener('click', () => setLesson(index)));
  prev.addEventListener('click', () => setLesson(activeIndex - 1));
  next.addEventListener('click', () => setLesson(activeIndex + 1));
})();
