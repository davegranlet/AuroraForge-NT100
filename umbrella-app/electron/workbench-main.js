'use strict';
// Fresh workbench shell; shared desktop operations remain in one implementation.
process.env.AURORA_START_PAGE = 'current-workbench.html';
process.env.AURORA_WINDOW_TITLE = 'Aurora Forge — Current Source Workbench';
require('./main');
