const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('WWE2K26Desktop', {
  toolLibrary: {
    list: () => ipcRenderer.invoke('desktop:tool-library-list'),
    source: id => ipcRenderer.invoke('desktop:tool-library-source', id),
    chooseFolder: () => ipcRenderer.invoke('desktop:tool-library-folder'),
    run: payload => ipcRenderer.invoke('desktop:tool-library-run', payload)
  },
  updates: {
    check: (payload) => ipcRenderer.invoke('desktop:update-check', payload),
    download: () => ipcRenderer.invoke('desktop:update-download'),
    install: () => ipcRenderer.invoke('desktop:update-install'),
    status: () => ipcRenderer.invoke('desktop:update-status')
  },
  getAppInfo: () => ipcRenderer.invoke('desktop:get-app-info'),
  openAnimationConverter: () => ipcRenderer.invoke('desktop:open-animation-converter'),
  chooseProjectFolder: () => ipcRenderer.invoke('desktop:choose-project-folder'),
  openDefaultProjectsFolder: () => ipcRenderer.invoke('desktop:open-default-projects-folder'),
  openDefaultExportsFolder: () => ipcRenderer.invoke('desktop:open-default-exports-folder'),
  saveTextFile: (payload) => ipcRenderer.invoke('desktop:save-text-file', payload),
  createProjectFolder: (payload) => ipcRenderer.invoke('desktop:create-project-folder', payload),
  saveProjectJson: (payload) => ipcRenderer.invoke('desktop:save-project-json', payload),
  openProjectJson: () => ipcRenderer.invoke('desktop:open-project-json'),
  getToolConfig: () => ipcRenderer.invoke('desktop:get-tool-config'),
  chooseToolPath: (toolId) => ipcRenderer.invoke('desktop:choose-tool-path', toolId),
  clearToolPath: (toolId) => ipcRenderer.invoke('desktop:clear-tool-path', toolId),
  openConfiguredTool: (toolId) => ipcRenderer.invoke('desktop:open-configured-tool', toolId),
  checkAuroraLoader: () => ipcRenderer.invoke('desktop:check-aurora-loader'),
  getDdsConverterStatus: () => ipcRenderer.invoke('desktop:dds-converter-status'),
  chooseDdsConverterInputs: (mode) => ipcRenderer.invoke('desktop:dds-converter-choose-inputs', mode),
  chooseDdsConverterFolder: (mode) => ipcRenderer.invoke('desktop:dds-converter-choose-folder', mode),
  chooseDdsConverterOutput: () => ipcRenderer.invoke('desktop:dds-converter-choose-output'),
  chooseDdsReferenceFolder: () => ipcRenderer.invoke('desktop:dds-converter-choose-reference-folder'),
  runDdsConversion: (payload) => ipcRenderer.invoke('desktop:dds-converter-run', payload),
  openDdsConverterOutput: () => ipcRenderer.invoke('desktop:dds-converter-open-output')
  ,openReferenceModelsFolder: () => ipcRenderer.invoke('desktop:open-reference-models-folder')
  ,getCakExplorerStatus: () => ipcRenderer.invoke('desktop:cak-explorer-status')
  ,chooseCakArchive: () => ipcRenderer.invoke('desktop:cak-explorer-choose-archive')
  ,openCakArchive: (archivePath, gameVersion) => ipcRenderer.invoke('desktop:cak-explorer-open', archivePath, gameVersion)
  ,openAllCakArchives: (gameVersion) => ipcRenderer.invoke('desktop:cak-explorer-open-all', gameVersion)
  ,searchCakArchive: (options) => ipcRenderer.invoke('desktop:cak-explorer-search', options)
  ,chooseCakOutput: () => ipcRenderer.invoke('desktop:cak-explorer-choose-output')
   ,extractCakEntries: (payload) => ipcRenderer.invoke('desktop:cak-explorer-extract', payload)
  ,openCakOutput: () => ipcRenderer.invoke('desktop:cak-explorer-open-output')
  ,chooseRepackSource: () => ipcRenderer.invoke('desktop:repackager-choose-source')
  ,buildRepackPackage: (sourceRoot) => ipcRenderer.invoke('desktop:repackager-build', sourceRoot)
  ,verifyRepackPackage: () => ipcRenderer.invoke('desktop:repackager-verify')
  ,openRepackOutput: () => ipcRenderer.invoke('desktop:repackager-open-output')
  ,createModSuiteWorkspace: () => ipcRenderer.invoke('desktop:mod-suite-create-workspace')
  ,chooseAndAuditModFolder: () => ipcRenderer.invoke('desktop:mod-suite-choose-audit-folder')
  ,openModSuiteFolder: (folderPath) => ipcRenderer.invoke('desktop:mod-suite-open-folder', folderPath)
  ,getPac19Status: () => ipcRenderer.invoke('desktop:pac19-status')
  ,choosePac19GameFolder: () => ipcRenderer.invoke('desktop:pac19-choose-game-folder')
  ,choosePac19Archive: () => ipcRenderer.invoke('desktop:pac19-choose-archive')
  ,openPac19Archive: (archivePath) => ipcRenderer.invoke('desktop:pac19-open', archivePath)
  ,choosePac19Output: () => ipcRenderer.invoke('desktop:pac19-choose-output')
  ,extractPac19Entries: (payload) => ipcRenderer.invoke('desktop:pac19-extract', payload)
  ,openPac19Output: () => ipcRenderer.invoke('desktop:pac19-open-output')
  ,choosePac19Replacement: () => ipcRenderer.invoke('desktop:pac19-choose-replacement')
  ,replacePac19Entry: (payload) => ipcRenderer.invoke('desktop:pac19-replace', payload)
  ,getCak20Status: () => ipcRenderer.invoke('desktop:cak20-status')
  ,chooseCak20GameFolder: () => ipcRenderer.invoke('desktop:cak20-choose-game-folder')
  ,listCak20Files: (options) => ipcRenderer.invoke('desktop:cak20-list-files', options)
  ,chooseCak20Output: () => ipcRenderer.invoke('desktop:cak20-choose-output')
  ,extractCak20Entries: (payload) => ipcRenderer.invoke('desktop:cak20-extract', payload)
  ,openCak20Output: () => ipcRenderer.invoke('desktop:cak20-open-output')
  ,getWorkshopCapabilities: () => ipcRenderer.invoke('desktop:workshop-capabilities')
  ,chooseWwe2K26Install: () => ipcRenderer.invoke('desktop:workshop-choose-wwe2k26')
  ,chooseSecureDataCtrlLink: () => ipcRenderer.invoke('desktop:workshop-choose-secure-loader')
  ,chooseSecureDataCtrlLinkZip: () => ipcRenderer.invoke('desktop:workshop-choose-secure-loader-zip')
  ,downloadSecureDataCtrlLink: () => ipcRenderer.invoke('desktop:workshop-download-secure-loader', { confirm: true })
  ,installSecureDataCtrlLink: () => ipcRenderer.invoke('desktop:workshop-install-secure-loader', { confirm: true })
  ,rollbackSecureDataCtrlLink: (operationId) => ipcRenderer.invoke('desktop:workshop-rollback-secure-loader', { confirm: true, operationId })
  ,getWorkshopJournal: () => ipcRenderer.invoke('desktop:workshop-journal')
  ,getWorkshopRedactedReport: () => ipcRenderer.invoke('desktop:workshop-redacted-report')
  ,getSecureDataCtrlLinkDiagnostics: () => ipcRenderer.invoke('desktop:workshop-loader-diagnostics')
  ,getCakCollisionReport: () => ipcRenderer.invoke('desktop:workshop-cak-collisions')
  ,getModManifest: () => ipcRenderer.invoke('desktop:workshop-mod-manifest')
  ,saveModManifest: (request) => ipcRenderer.invoke('desktop:workshop-save-mod-manifest', request)
  ,entryStudio: {
    getDefaults: () => ipcRenderer.invoke('desktop:entry-studio-defaults'),
    saveConfig: (patch) => ipcRenderer.invoke('desktop:entry-studio-save-config', patch),
    chooseFolder: () => ipcRenderer.invoke('desktop:entry-studio-choose-folder'),
    scan: (folder) => ipcRenderer.invoke('desktop:entry-studio-scan', folder),
    addFiles: () => ipcRenderer.invoke('desktop:entry-studio-add-files'),
    convert: (payload) => ipcRenderer.invoke('desktop:entry-studio-convert', payload),
    listEntries: () => ipcRenderer.invoke('desktop:entry-studio-entries'),
    createEntry: (payload) => ipcRenderer.invoke('desktop:entry-studio-create', payload),
    getEntry: (entryId) => ipcRenderer.invoke('desktop:entry-studio-get-entry', entryId),
    writeEntry: (payload) => ipcRenderer.invoke('desktop:entry-studio-write-entry', payload),
    music: () => ipcRenderer.invoke('desktop:entry-studio-music'),
    bake: (payload) => ipcRenderer.invoke('desktop:entry-studio-bake', payload),
    stage: (payload) => ipcRenderer.invoke('desktop:entry-studio-stage', payload)
  }
  ,audioStudio: {
    getDefaults: () => ipcRenderer.invoke('desktop:audio-studio-defaults'),
    saveConfig: (patch) => ipcRenderer.invoke('desktop:audio-studio-save-config', patch),
    chooseFolder: () => ipcRenderer.invoke('desktop:audio-studio-choose-folder'),
    chooseMusicList: () => ipcRenderer.invoke('desktop:audio-studio-choose-musiclist'),
    listMusic: () => ipcRenderer.invoke('desktop:audio-studio-list'),
    addFiles: () => ipcRenderer.invoke('desktop:audio-studio-add-files'),
    build: (payload) => ipcRenderer.invoke('desktop:audio-studio-build', payload)
  }
  ,converter: {
    getDefaults: () => ipcRenderer.invoke('desktop:converter-defaults'),
    saveConfig: (patch) => ipcRenderer.invoke('desktop:converter-save-config', patch),
    gameVersion: (folder) => ipcRenderer.invoke('desktop:converter-game-version', folder),
    chooseFolder: () => ipcRenderer.invoke('desktop:converter-choose-folder'),
    chooseOutput: () => ipcRenderer.invoke('desktop:converter-choose-output'),
    extract: (payload) => ipcRenderer.invoke('desktop:converter-extract', payload),
    build: (payload) => ipcRenderer.invoke('desktop:converter-build', payload),
    onLog: (callback) => ipcRenderer.on('converter-log', (_event, text) => callback(text))
  }
});
