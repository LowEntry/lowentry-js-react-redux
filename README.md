# @lowentry/react-redux

Simplifies the use of Redux in your React project.


## Description

This plugin will add utility functions to make it easier to use Redux in your React project.

For example, some of the things it does is:

- it combines React, Redux, ReactRedux, RTK, etc, functions into a single object, so you won't have to figure out where it is located anymore, you simply call LeRed.functionName.
- it provides improvements to the regular Redux functions, such as `createSlice` (allowing you to call those actions directly), and `useEffect` (solving the comparison of the given dependencies' values using `fast-deep-equal/react`, rather than doing a shallow compare).
- it provides lots of helper functions, such as `useEffectInterval` (which is a combination of `useEffect` and `setInterval`).
- it automatically adds support for Redux-Saga to your Redux code, allowing you to call other Redux actions from within a Redux action (as well as the host of other things that Redux-Saga can do, such as obtain the data from selectors, run delays, etc).

All of this basically just:

1. cleans up your code
2. provides more powerful features to React and Redux
3. improves consistency
4. and makes it easier to work with React and Redux in your projects.


### Example

```javascript
// ./src/pages/index.js
import {LeRed} from '@lowentry/react-redux';
import {stateTimer} from '../state/stateTimer.js';
import {App} from '../components/App.jsx';

export const Head = () => (
  <title>Home Page</title>
);

export default LeRed.memo(({}) =>
{
  const store = LeRed.useConfigureStore({slices:{stateTimer}});
  return (
    <LeRed.Root store={store}>
      <App/>
    </LeRed.Root>
  );
});
```

```javascript
// ./src/state/stateTimer.js
import {LeRed} from '@lowentry/react-redux';

export const stateTimer = LeRed.createSlice
({
  state:
    {
      counter:0,
    },
  actions:
    {
      reset:
        (state) =>
        {
          state.counter = 0;
        },
      
      increase:
        (state, data) =>
        {
          state.counter += (data ?? 1);
        },
      
      decrease:
        (state, data) =>
        {
          state.counter -= (data ?? 1);
        },
      
      waitAndIncrease:
        function* (data)
        {
          const seconds = (data ?? 1);
          yield LeRed.effects.delay(seconds * 1000);
          yield LeRed.effects.put(stateTimer.actions.increase(seconds));
        },
    },
  selectors:
    {
      counter:
        state => state.counter,
    },
});
```

```javascript
// ./src/components/App.jsx
import {LeRed} from '@lowentry/react-redux';
import {Button} from '@mui/material';
import {stateTimer} from '../state/stateTimer.js';

export const App = LeRed.memo(({}) =>
{
  const dispatch = LeRed.useDispatch();
  const counter = LeRed.useSelector(stateTimer.selectors.counter);
  const previousCounter = LeRed.usePrevious(counter);
  
  LeRed.useEffectInterval(() =>
  {
    dispatch(stateTimer.actions.increase(1));
  }, [], 1000);
  
  return (
    <div>
      <p>
        <div>Seconds: {counter}</div>
        {(typeof previousCounter !== 'undefined') && (<div>Previously: {previousCounter}</div>)}
      </p>
      <Button color="primary" variant="contained" size="small" onClick={() => dispatch(stateTimer.actions.reset())}>Reset</Button>
    </div>
  );
});
```


## Final words

I hope this plugin will be useful to you. If you have any questions or suggestions, please feel free to get in touch at [LowEntry.com](https://lowentry.com/).
