# gatsby-plugin-automatic-importer

Automatically generate an import statements file for your project, and includes it in your project's files.

## Description

Tired of manually managing your import statements? To have to constantly rework your project whenever you move or rename a file?

This plugin will automatically generate an import statements file for your project, and automatically includes it in your project's files.

### Example

For example, I have a project with some .less files and some .js and .jsx files. After having set up the plugin, it now generates this file automatically at `/imports.js`:

```javascript
import './src/resources/css/components/your-code.less';
import './src/resources/css/libs/common-functions.less';
import './src/resources/css/libs/inputfield-transparent-background.less';
import './src/resources/css/libs/swipedown-refresh-disabler.less';
import './src/resources/css/libs/text-selection-disabler.less';
import {App} from './src/resources/js/components/App.jsx';
import {AppTimer} from './src/resources/js/components/AppTimer.jsx';
import {stateTimer} from './src/resources/js/state/timer.js';

export {App, AppTimer, stateTimer};
```

It also automatically imports this in my files. So for example, in `/src/resources/js/components/App.jsx`, it now has this at the top:

```javascript
import {AppTimer, stateTimer} from './../../../../imports.js';
```

This completely automates having to manage your imports, and makes it much easier to move and rename your files.

## Usage

Add the plugin to your `gatsby-config.js` plugins array, like:

```javascript
module.exports = {
    // ...
    plugins:[
        // ...
        {
            resolve:'gatsby-plugin-automatic-importer',
            options:{
                'import':[
                    './src/resources/',
                ],
                'modify':[
                    './src/resources/',
                    './src/pages/',
                ],
            },
        },
    ],
};
```

- the `import` array is for files (and folders) which will be added to your imports file.
- the `modify` array is for files (and folders) which will be modified to automatically add the import statements to.

## Additional imports

For importing anything other than files and folders (such as plugins and libraries), you can add a file to your project that imports them, for example:

```javascript
import * as React from 'react';

import * as MaterialUI from '@mui/material';
import * as MaterialUILab from '@mui/lab';

import * as ReactDnd from 'react-dnd';


export {React, ReactDnd};
export const MUI = {...MaterialUI, Lab:MaterialUILab};
```

Note that this will mess up tree shaking, so it's best to only use this for things that are actually used in your project. Or when you're still prototyping and just want to move fast, and don't care about optimizations and efficiency yet.

## Final words

I hope this plugin will be useful to you. If you have any questions or suggestions, feel free to contact me at [LowEntry.com](https://lowentry.com/).
