module.exports = {
  appId: 'com.vikingstudios.auroraforge.nt100',
  productName: 'AuroraForge NT100',
  copyright: 'Copyright © 2026 VikingStudios',
  directories: {
    app: 'build/runtime-staging',
    output: 'dist/installer',
    buildResources: 'installer'
  },
  asar: true,
  asarUnpack: ['app/tools/**'],
  extraResources: [
    { from: 'build/library/sl', to: 'sl' }
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'app/assets/img/app-icon.ico',
    artifactName: 'AuroraForge-NT100-Setup-${version}-${arch}.${ext}'
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'AuroraForge NT100',
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
    include: 'installer.nsh'
  },
  publish: {
    provider: 'github',
    owner: 'davegranlet',
    repo: 'AuroraForge-NT100',
    releaseType: 'release'
  }
};
