import * as RTK from '@reduxjs/toolkit';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactRedux from 'react-redux';
import * as ReduxSaga from 'redux-saga';
import * as ReduxSagaEffects from 'redux-saga/effects';
import FastDeepEqualReact from 'fast-deep-equal/react';
import {LeUtils, ISSET, ARRAY, STRING} from '@lowentry/utils';

export const LeRed = (() =>
{
	const LeRed = {};
	
	
	try
	{
		const set = (value, key, ignoreOverrides = false) =>
		{
			const keyFirstChar = key.charAt(0);
			if(keyFirstChar === keyFirstChar.toLowerCase() && (keyFirstChar !== keyFirstChar.toUpperCase()))
			{
				if((key === 'default') || (key === 'version'))
				{
					return;
				}
				if((key === 'set') || (key === 'setAll'))
				{
					console.error('tried to override LeRed["' + key + '"], which isn\'t allowed, to:');
					console.error(value);
					return;
				}
				if((ignoreOverrides !== true) && (key in LeRed))
				{
					console.warn('LeRed["' + key + '"] was overwritten, from:');
					console.warn(LeRed[key]);
					console.warn('to:');
					console.warn(value);
				}
				LeRed[key] = value;
			}
		};
		const setAll = (obj, ignoreOverrides = false, optionalSkipHasOwnPropertyCheck = true) =>
		{
			LeUtils.each(obj, (value, key) =>
			{
				set(value, key, ignoreOverrides);
			}, optionalSkipHasOwnPropertyCheck);
		};
		
		LeRed.set = (value, key) => set(value, key, true);
		LeRed.setAll = (obj, optionalSkipHasOwnPropertyCheck = true) => setAll(obj, true, optionalSkipHasOwnPropertyCheck);
		
		setAll(ReactDOM);
		setAll(ReduxSaga);
		setAll({effects:ReduxSagaEffects});
		setAll(RTK);
		setAll(React);
		setAll(ReactRedux);
		
		LeRed.effects.delayFrames = function* (frames = 1)
		{
			yield LeRed.effects.call(() =>
			{
				return new Promise((resolve, reject) =>
				{
					try
					{
						LeUtils.setAnimationFrameTimeout(resolve, frames);
					}
					catch(e)
					{
						reject(e);
					}
				});
			});
		};
		
		LeRed.effects.interval = function* (callback, intervalMs)
		{
			// noinspection JSUnresolvedReference
			let channel = LeRed.eventChannel((emitter) =>
			{
				const interval = setInterval(() =>
				{
					emitter({});
				}, intervalMs);
				return () =>
				{
					clearInterval(interval);
				};
			});
			
			const stop = () =>
			{
				try
				{
					if(channel !== null)
					{
						channel.close();
						channel = null;
					}
				}
				catch(e)
				{
					console.error(e);
				}
			};
			
			while(channel !== null)
			{
				try
				{
					yield LeRed.effects.take(channel);
					yield callback(stop);
				}
				catch(e)
				{
					console.error(e);
				}
				finally
				{
					try
					{
						// noinspection JSUnresolvedReference
						if(yield LeRed.effects.cancelled())
						{
							channel.close();
							channel = null;
						}
					}
					catch(e)
					{
						console.error(e);
					}
				}
			}
		};
	}
	catch(e)
	{
		console.error(e);
	}
	
	
	const fixEqualsComparator = (equalsComparator, errorMessage) =>
	{
		if(ISSET(equalsComparator))
		{
			if(typeof equalsComparator !== 'function')
			{
				console.error(errorMessage);
				console.error(equalsComparator);
				return FastDeepEqualReact;
			}
			return equalsComparator;
		}
		return FastDeepEqualReact;
	};
	
	const useCompareMemoize = (value, equalsComparator) =>
	{
		const ref = React.useRef();
		if(!equalsComparator(value, ref.current))
		{
			ref.current = value;
		}
		return ref.current;
	};
	
	
	LeRed.Root = LeRed.memo(({store, children}) =>
	{
		return React.createElement(ReactRedux.Provider, {store}, children);
	});
	
	LeRed.createRootElement = (elementClass, storeData) =>
	{
		if(ISSET(storeData))
		{
			storeData = LeRed.configureStore(storeData);
			return React.createElement(ReactRedux.Provider, {store:storeData}, React.createElement(elementClass));
		}
		return React.createElement(elementClass);
	};
	
	LeRed.createElement = (elementClass, props = null, ...children) =>
	{
		return React.createElement(elementClass, props, ...children);
	};
	
	LeRed.configureStore = (storeData) =>
	{
		if(storeData.__lowentry_store__ === true)
		{
			return storeData;
		}
		// noinspection JSUnresolvedReference
		if(ISSET(storeData.slices))
		{
			// noinspection JSUnresolvedReference
			storeData.reducer = storeData.slices;
			// noinspection JSUnresolvedReference
			delete storeData.slices;
		}
		let sagaListeners = [];
		if(ISSET(storeData.reducer))
		{
			let slices = storeData.reducer;
			if(typeof slices === 'object')
			{
				if(slices.name || slices.__lowentry_unfinished_slice)
				{
					slices = [slices];
				}
				else
				{
					let slicesArray = [];
					LeUtils.each(slices, (slice, index) =>
					{
						if(!slice.name)
						{
							slice.name = index;
						}
						slicesArray.push(slice);
					});
					slices = slicesArray;
				}
			}
			slices = ARRAY(slices);
			
			let initialState = {};
			let reducerArrays = {};
			LeUtils.each(slices, (slice, index) =>
			{
				if(!slice.name)
				{
					slice.name = 'slice_' + index;
				}
				if(slice.__lowentry_unfinished_slice)
				{
					delete slice.__lowentry_unfinished_slice;
					slice = LeRed.createSlice(slice);
				}
				initialState[slice.name] = ((typeof slice.state === 'function') ? slice.state() : slice.state);
				LeUtils.each(slice.reducers, (reducer, reducerName) =>
				{
					const fullReducerName = reducerName.startsWith('lowentrystore/') ? reducerName.substring('lowentrystore/'.length) : (slice.name + '/' + reducerName);
					if(typeof reducerArrays[fullReducerName] === 'undefined')
					{
						reducerArrays[fullReducerName] = [];
					}
					reducerArrays[fullReducerName].push(reducer);
				});
				LeUtils.each(slice.sagaListeners, (sagaListener, reducerName) =>
				{
					LeUtils.each(LeUtils.flattenArray(sagaListener), (listener) =>
					{
						try
						{
							sagaListeners.push(listener());
						}
						catch(e)
						{
							console.error('an error was thrown by your saga code, in slice "' + slice.name + '", action "' + reducerName + '":');
							console.error(e);
						}
					});
				});
			});
			
			let reducers = {};
			LeUtils.each(reducerArrays, (reducerArray, reducerName) =>
			{
				reducerArray = LeUtils.flattenArray(reducerArray);
				if(reducerArray.length <= 0)
				{
					reducers[reducerName] = reducerArray[0];
				}
				else
				{
					reducers[reducerName] = (...args) =>
					{
						LeUtils.each(reducerArray, (reducer) =>
						{
							try
							{
								reducer(...args);
							}
							catch(e)
							{
								console.error(e);
							}
						});
					};
				}
			});
			
			storeData.reducer = RTK.createSlice({
				name:        'lowentrystore',
				initialState:initialState,
				reducers:    reducers,
			}).reducer;
		}
		if(ISSET(storeData.state))
		{
			storeData.preloadedState = storeData.state;
			delete storeData.state;
		}
		if(ISSET(storeData.preloadedState))
		{
			storeData.preloadedState = {reducer:storeData.preloadedState};
		}
		
		let middleware = ARRAY(storeData.middleware);
		let sagaMiddleware = null;
		if(sagaListeners.length > 0)
		{
			sagaMiddleware = ReduxSaga.default();
			middleware.push(sagaMiddleware);
		}
		storeData.middleware = (getDefaultMiddleware) => getDefaultMiddleware().concat(...middleware);
		
		let store = RTK.configureStore(storeData);
		store.__lowentry_store__ = true;
		store.state = () => store.getState().reducer;
		
		const dispatch = store.dispatch;
		// noinspection JSValidateTypes
		store.dispatch = (action) =>
		{
			action.__lowentry_dispatch__ = true;
			if(STRING(action.type).startsWith('lowentrystore/lowentryaction/'))
			{
				action.__lowentry_dispatch_result__ = [];
			}
			else
			{
				delete action.__lowentry_dispatch_result__;
			}
			dispatch(action);
			const result = action.__lowentry_dispatch_result__;
			delete action.__lowentry_dispatch_result__;
			delete action.__lowentry_dispatch__;
			return result;
		};
		
		if(sagaMiddleware !== null)
		{
			sagaMiddleware.run(function* ()
			{
				yield ReduxSagaEffects.all(sagaListeners);
			});
		}
		return store;
	};
	
	LeRed.createAction = (id) =>
	{
		return RTK.createAction('lowentrystore/lowentryaction/' + id);
	};
	
	LeRed.createSelector = (selectorsGenerator) =>
	{
		return function(stateOfSlice)
		{
			const state = this;
			const selectors = selectorsGenerator.apply(state, [stateOfSlice]);
			let selectorArgs = [];
			
			for(let i = 0; i < selectors.length - 1; i++)
			{
				let selectorsEntry = selectors[i];
				if(typeof selectorsEntry === 'function')
				{
					selectorsEntry = selectorsEntry.apply(state, [state]);
				}
				selectorArgs.push(selectorsEntry);
			}
			
			let finalSelector = selectors[selectors.length - 1];
			if(typeof finalSelector === 'function')
			{
				finalSelector = finalSelector.apply(state, selectorArgs);
			}
			return finalSelector;
		};
	};
	
	LeRed.createCachedSelector = (selectorsGenerator, equalsComparator) =>
	{
		equalsComparator = fixEqualsComparator(equalsComparator, 'LeRed.createCachedSelector() was given an invalid comparator:');
		if(equalsComparator === false)
		{
			return;
		}
		let previousSelectorArgs = null;
		let previousFinalSelectorResult = null;
		return function(stateOfSlice)
		{
			const state = this;
			const selectors = selectorsGenerator.apply(state, [stateOfSlice]);
			let selectorArgs = [];
			
			for(let i = 0; i < selectors.length - 1; i++)
			{
				let selectorsEntry = selectors[i];
				if(typeof selectorsEntry === 'function')
				{
					selectorsEntry = selectorsEntry.apply(state, [state]);
				}
				selectorArgs.push(selectorsEntry);
			}
			
			let finalSelector = selectors[selectors.length - 1];
			if(typeof finalSelector === 'function')
			{
				if(equalsComparator(previousSelectorArgs, selectorArgs))
				{
					finalSelector = previousFinalSelectorResult;
				}
				else
				{
					finalSelector = finalSelector.apply(state, selectorArgs);
					previousSelectorArgs = selectorArgs;
					previousFinalSelectorResult = finalSelector;
				}
			}
			return finalSelector;
		};
	};
	
	LeRed.createSlice = (slice) =>
	{
		if(Array.isArray(slice))
		{
			const e = new Error('the given slice is an array (instead of an object)');
			console.error('an error was thrown by your LeRed.createSlice(...) code:');
			console.error(e);
			throw e;
		}
		if(slice.name)
		{
			let actions = {};
			let reducers = {};
			let sagas = {};
			let sagaListeners = {};
			LeUtils.each(slice.actions, (reducer, reducerNames) =>
			{
				LeUtils.each(reducerNames.split(','), (reducerName) =>
				{
					if(reducerName.length <= 0)
					{
						return;
					}
					const reducerAction = RTK.createAction((reducerName.startsWith('lowentrystore/') ? '' : ('lowentrystore/' + slice.name + '/')) + reducerName);
					actions[reducerName] = reducerAction;
					LeUtils.each(LeUtils.flattenArray(reducer), (reducer) =>
					{
						if(LeUtils.isGeneratorFunction(reducer))
						{
							const sagaListener = function* ()
							{
								// noinspection JSUnresolvedReference
								yield ReduxSagaEffects.takeEvery(reducerAction, function* (action)
								{
									let promiseResolve = null;
									let promiseReject = null;
									try
									{
										if(action.__lowentry_dispatch__ === true)
										{
											const promise = new Promise((resolve, reject) =>
											{
												promiseResolve = resolve;
												promiseReject = reject;
											});
											if(Array.isArray(action.__lowentry_dispatch_result__))
											{
												if(typeof promise !== 'undefined')
												{
													action.__lowentry_dispatch_result__.push(promise);
												}
											}
											else
											{
												action.__lowentry_dispatch_result__ = promise;
											}
										}
										
										const result = yield reducer.apply(slice, [action.payload]);
										if(promiseResolve !== null)
										{
											promiseResolve(result);
										}
									}
									catch(e)
									{
										console.error('an error was thrown by your LeRed.createSlice(...) code, by slice "' + slice.name + '", action "' + reducerName + '":');
										console.error(e);
										if(promiseReject !== null)
										{
											try
											{
												promiseReject(e);
											}
											catch(e2)
											{
												console.error(e2);
											}
										}
									}
								});
							};
							
							if(ISSET(sagas[reducerName]))
							{
								sagas[reducerName].push(reducer);
							}
							else
							{
								sagas[reducerName] = [reducer];
							}
							
							if(ISSET(sagaListeners[reducerName]))
							{
								sagaListeners[reducerName].push(sagaListener);
							}
							else
							{
								sagaListeners[reducerName] = [sagaListener];
							}
						}
						else
						{
							const reducerFunction = (state, action) =>
							{
								try
								{
									const result = reducer.apply(state, [state[slice.name], action.payload]);
									if(action.__lowentry_dispatch__ === true)
									{
										if(Array.isArray(action.__lowentry_dispatch_result__))
										{
											if(typeof result !== 'undefined')
											{
												action.__lowentry_dispatch_result__.push(result);
											}
										}
										else
										{
											action.__lowentry_dispatch_result__ = result;
										}
									}
								}
								catch(e)
								{
									console.error('an error was thrown by your LeRed.createSlice(...) code, by slice "' + slice.name + '", action "' + reducerName + '":');
									console.error(e);
								}
							};
							
							if(ISSET(reducers[reducerName]))
							{
								reducers[reducerName].push(reducerFunction);
							}
							else
							{
								reducers[reducerName] = [reducerFunction];
							}
						}
					});
				});
			});
			slice.actions = actions;
			slice.reducers = reducers;
			slice.sagas = sagas;
			slice.sagaListeners = sagaListeners;
			
			let selectors = {};
			LeUtils.each(slice.selectors, (selector, selectorName) =>
			{
				selectors[selectorName] = (state) =>
				{
					try
					{
						return selector.apply(state, [state[slice.name]]);
					}
					catch(e)
					{
						console.error('an error was thrown by your LeRed.createSlice(...) code, by slice "' + slice.name + '", selector "' + selectorName + '":');
						console.error(e);
						throw e;
					}
				};
			});
			slice.selectors = selectors;
			
			let getters = {};
			LeUtils.each(slice.getters, (getter, getterName) =>
			{
				getters[getterName] = (...params) =>
				{
					try
					{
						const selector = getter.apply(window, [params]);
						return (state) =>
						{
							try
							{
								return selector.apply(state, [state[slice.name]]);
							}
							catch(e)
							{
								console.error('an error was thrown by your LeRed.createSlice(...) code, by slice "' + slice.name + '", getter "' + getterName + '":');
								console.error(e);
								throw e;
							}
						};
					}
					catch(e)
					{
						console.error('an error was thrown by your LeRed.createSlice(...) code, by slice "' + slice.name + '", getter "' + getterName + '":');
						console.error(e);
						throw e;
					}
				};
			});
			slice.getters = getters;
			return slice;
		}
		else
		{
			slice.__lowentry_unfinished_slice = true;
			return slice;
		}
	};
	
	LeRed.createFastSlice = (slice) =>
	{
		if(Array.isArray(slice))
		{
			const e = new Error('the given slice is an array (instead of an object)');
			console.error('an error was thrown by your LeRed.createFastSlice(...) code:');
			console.error(e);
			throw e;
		}
		
		let actions = {};
		LeUtils.each(slice.actions, (reducer, reducerName) =>
		{
			actions[reducerName] = (...params) => reducer.apply(slice, [slice.state, ...params]);
		});
		slice.actions = actions;
		
		let selectors = {};
		LeUtils.each(slice.selectors, (selector, selectorName) =>
		{
			selectors[selectorName] = () => selector.apply(slice, [slice.state]);
		});
		slice.selectors = new Proxy(selectors, {
			get:(target, key) => (key in target) ? target[key]() : undefined,
		});
		
		let getters = {};
		LeUtils.each(slice.getters, (selector, selectorName) =>
		{
			getters[selectorName] = (...params) => selector.apply(slice, [slice.state, ...params]);
		});
		slice.getters = getters;
		return slice;
	};
	
	LeRed.current = (obj) =>
	{
		try
		{
			return RTK.current(obj);
		}
		catch(e)
		{
		}
		return obj;
	};
	
	LeRed.useConfigureStore = (storeData) =>
	{
		return React.useMemo(() => LeRed.configureStore(storeData), [storeData]);
	};
	
	LeRed.useSelector = (selector, equalsComparator) =>
	{
		if(typeof selector !== 'function')
		{
			console.error('LeRed.useSelector() was given an invalid selector:');
			console.error(selector);
			selector = () =>
			{
			};
		}
		equalsComparator = fixEqualsComparator(equalsComparator, 'LeRed.useSelector() was given an invalid comparator:');
		return ReactRedux.useSelector(selector, equalsComparator);
	};
	
	LeRed.useEffect = (callable, comparingValues, equalsComparator) =>
	{
		equalsComparator = fixEqualsComparator(equalsComparator, 'LeRed.useEffect() was given an invalid comparator:');
		comparingValues = ARRAY(comparingValues);
		// eslint-disable-next-line react-hooks/rules-of-hooks
		comparingValues = comparingValues.map(value => useCompareMemoize(value, equalsComparator));
		// eslint-disable-next-line react-hooks/exhaustive-deps
		return React.useEffect(callable, comparingValues);
	};
	
	LeRed.useEffectInterval = (callable, comparingValues, intervalMs, fireImmediately, equalsComparator) =>
	{
		return LeRed.useEffect(() => LeUtils.setInterval(callable, intervalMs, fireImmediately).remove, [comparingValues, equalsComparator]);
	};
	
	LeRed.useEffectAnimationFrameInterval = (callable, comparingValues, intervalFrames, fireImmediately, equalsComparator) =>
	{
		return LeRed.useEffect(() => LeUtils.setAnimationFrameInterval(callable, intervalFrames, fireImmediately).remove, [comparingValues, equalsComparator]);
	};
	
	LeRed.useEffectGenerator = (callable, comparingValues, intervalMs, fireImmediately, equalsComparator) =>
	{
		return LeRed.useEffect(() =>
		{
			let stop = false;
			
			(async () =>
			{
				for(const promise of callable())
				{
					if(stop)
					{
						return;
					}
					await promise;
					if(stop)
					{
						return;
					}
				}
			})();
			
			return () =>
			{
				stop = true;
			};
		}, [comparingValues, equalsComparator]);
	};
	
	LeRed.useEffectGeneratorLoop = (callable, comparingValues, intervalMs, fireImmediately, equalsComparator) =>
	{
		return LeRed.useEffect(() =>
		{
			let stop = false;
			
			(async () =>
			{
				while(!stop)
				{
					for(const promise of callable())
					{
						if(stop)
						{
							return;
						}
						await promise;
						if(stop)
						{
							return;
						}
					}
				}
			})();
			
			return () =>
			{
				stop = true;
			};
		}, [comparingValues, equalsComparator]);
	};
	
	LeRed.useEffectShutdown = (callable, comparingValues, equalsComparator) =>
	{
		return LeRed.useEffect(() =>
		{
			let stop = false;
			
			const run = () =>
			{
				if(stop)
				{
					return;
				}
				stop = true;
				if(typeof window !== 'undefined')
				{
					window.removeEventListener('beforeunload', run);
				}
				callable();
			};
			
			if(typeof window !== 'undefined')
			{
				window.addEventListener('beforeunload', run);
			}
			return run;
		}, [comparingValues, equalsComparator]);
	};
	
	LeRed.memo = (component, equalsComparator) =>
	{
		equalsComparator = fixEqualsComparator(equalsComparator, 'LeRed.memo() was given an invalid comparator:');
		return React.memo(component, equalsComparator);
	};
	
	LeRed.useMemo = (callable, comparingValues, equalsComparator) =>
	{
		equalsComparator = fixEqualsComparator(equalsComparator, 'LeRed.useMemo() was given an invalid comparator:');
		comparingValues = ARRAY(comparingValues);
		// eslint-disable-next-line react-hooks/rules-of-hooks
		comparingValues = comparingValues.map(value => useCompareMemoize(value, equalsComparator));
		// eslint-disable-next-line react-hooks/exhaustive-deps
		return React.useMemo(callable, comparingValues);
	};
	
	LeRed.usePrevious = (value, initialValue) =>
	{
		const ref = LeRed.useRef(initialValue);
		LeRed.useEffect(() =>
		{
			ref.current = value;
		}, [value]);
		return ref.current;
	};
	
	LeRed.useFont = (font) =>
	{
		font = '12px ' + STRING(font).trim();
		const [hasFont, setHasFont] = LeRed.useState(false);
		LeRed.useEffect(() =>
		{
			if(!hasFont)
			{
				if(!ISSET(document?.fonts?.check))
				{
					setHasFont(true);
					return;
				}
				
				const handler = setInterval(() =>
				{
					try
					{
						if(document.fonts.check(font))
						{
							clearInterval(handler);
							setHasFont(true);
						}
					}
					catch(e)
					{
						console.error(e);
						clearInterval(handler);
						setHasFont(true);
					}
				}, 30);
			}
		}, [hasFont]);
		return hasFont;
	};
	
	/**
	 * Adds a <script> tag to the <head> of the document.
	 * Only for development and testing purposes.
	 *
	 * @param {string} url The URL of the js file to include.
	 * @param {object} props Additional props of the <script> tag.
	 */
	LeRed.useScript = (url, props = {}) =>
	{
		return LeRed.useEffect(() =>
		{
			const script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = url;
			
			LeUtils.each(props, (value, key) =>
			{
				script.setAttribute(key, value);
			});
			
			document.head.appendChild(script);
			return () => document.head.removeChild(script);
		}, [url, props]);
	};
	
	LeRed.mergeRefs = (...refs) =>
	{
		refs = LeUtils.flattenArray(refs);
		if(!refs)
		{
			return null;
		}
		
		let newRefs = [];
		LeUtils.each(refs, (ref) =>
		{
			if(ref)
			{
				newRefs.push(ref);
			}
		});
		refs = newRefs;
		
		if(refs.length <= 0)
		{
			return null;
		}
		if(refs.length === 1)
		{
			return refs[0];
		}
		return (inst) =>
		{
			LeUtils.each(refs, (ref) =>
			{
				try
				{
					if(typeof ref === 'function')
					{
						ref(inst);
					}
					else if(ref)
					{
						ref.current = inst;
					}
				}
				catch(e)
				{
					console.error(e);
				}
			});
		};
	};
	
	if(typeof Proxy === 'undefined')
	{
		return LeRed;
	}
	
	return new Proxy(LeRed, {
		set:(target, key, value) =>
		    {
			    LeRed.set(key, value);
			    return true;
		    },
	});
})();
