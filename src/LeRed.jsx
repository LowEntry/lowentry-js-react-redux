import * as RTK from '@reduxjs/toolkit';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactRedux from 'react-redux';
import * as ReduxSaga from 'redux-saga';
import * as ReduxSagaEffects from 'redux-saga/effects';
import FastDeepEqualReact from 'fast-deep-equal/react';
import {LeUtils, ISSET, ARRAY, STRING, INT_LAX_ANY, IS_OBJECT, IS_ARRAY} from '@lowentry/utils';


export const LeRed = (() =>
{
	/** @type {object} */
	const LeRed = {};
	
	
	try
	{
		const set = (key, value, ignoreOverrides = false) =>
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
				set(key, value, ignoreOverrides);
			}, optionalSkipHasOwnPropertyCheck);
		};
		
		LeRed.set = (key, value) => set(key, value, true);
		LeRed.setAll = (obj, optionalSkipHasOwnPropertyCheck = true) => setAll(obj, true, optionalSkipHasOwnPropertyCheck);
		
		setAll(ReactDOM);
		setAll(ReduxSaga);
		setAll({effects:{...ReduxSagaEffects}});
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
	
	
	LeRed.configureStore = (storeData) =>
	{
		if(storeData.__lowentry_store__ === true)
		{
			return storeData;
		}
		if(ISSET(storeData.slices))
		{
			storeData.reducer = storeData.slices;
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
			
			/** @type {object|*} */
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
		
		/** @type {RTK.EnhancedStore|*} */
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
								yield ReduxSagaEffects.takeEvery(reducerAction, function* (/** @type {RTK.Action|*} */ action)
								{
									/** @type {((value:*)=>void)|null|*} */
									let promiseResolve = null;
									/** @type {((reason:*)=>void)|null|*} */
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
						const selector = getter(...params);
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
		return LeRed.useMemo(() => LeRed.configureStore(storeData), [storeData]);
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
			const run = () =>
			{
				callable();
			};
			
			globalThis?.addEventListener?.('beforeunload', run, {capture:true});
			return () =>
			{
				globalThis?.removeEventListener?.('beforeunload', run, {capture:true});
				run();
			};
		}, [comparingValues, equalsComparator]);
	};
	
	LeRed.useEffectPageFocusLost = (callable, comparingValues, equalsComparator) =>
	{
		const events = ['pagehide', 'freeze', 'blur', 'visibilitychange'];
		return LeRed.useEffect(() =>
		{
			const run = () =>
			{
				if((globalThis?.document?.visibilityState !== 'hidden') && globalThis?.document?.hasFocus?.())
				{
					return;
				}
				callable();
			};
			
			events.forEach(type =>
			{
				globalThis?.addEventListener?.(type, run, {capture:true});
			});
			return () =>
			{
				events.forEach(type =>
				{
					globalThis?.removeEventListener?.(type, run, {capture:true});
				});
			};
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
	
	LeRed.useCallback = (callable, comparingValues, equalsComparator) =>
	{
		equalsComparator = fixEqualsComparator(equalsComparator, 'LeRed.useCallback() was given an invalid comparator:');
		comparingValues = ARRAY(comparingValues);
		// eslint-disable-next-line react-hooks/rules-of-hooks
		comparingValues = comparingValues.map(value => useCompareMemoize(value, equalsComparator));
		// eslint-disable-next-line react-hooks/exhaustive-deps
		return React.useCallback(callable, comparingValues);
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
				if(!globalThis?.document?.fonts?.check)
				{
					setHasFont(true);
					return;
				}
				
				const handler = setInterval(() =>
				{
					try
					{
						if(globalThis.document.fonts.check(font))
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
			if(!globalThis?.document?.createElement || !globalThis?.document?.head?.appendChild || !globalThis?.document?.head?.removeChild)
			{
				return;
			}
			
			const script = globalThis.document.createElement('script');
			script.type = 'text/javascript';
			script.src = url;
			
			LeUtils.each(props, (value, key) =>
			{
				script.setAttribute(key, value);
			});
			
			globalThis.document.head.appendChild(script);
			return () => globalThis.document.head.removeChild(script);
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
	
	LeRed.useTriggerable = (event) =>
	{
		const [[value, uniqueId], setValue] = LeRed.useState([null, LeUtils.uniqueId()]);
		
		LeRed.useEffect(() =>
		{
			if(!globalThis?.addEventListener || !globalThis?.removeEventListener)
			{
				return;
			}
			
			const callback = (e) =>
			{
				setValue([e?.detail, LeUtils.uniqueId()]);
			};
			
			const eventName = 'lowentrytriggerable_' + event;
			globalThis.addEventListener(eventName, callback);
			return () => globalThis.removeEventListener(eventName, callback);
		}, [event]);
		
		return value;
	};
	
	LeRed.trigger = (event, value) =>
	{
		if(!globalThis?.dispatchEvent || !globalThis?.CustomEvent)
		{
			return;
		}
		const eventName = 'lowentrytriggerable_' + event;
		globalThis.dispatchEvent(new globalThis.CustomEvent(eventName, {detail:value}));
	};
	
	/**
	 * A useState() hook that automatically resets to the defaultValue after the given duration.
	 *
	 * Example:
	 *
	 * ```js
	 * const [value, setValue] = LeRed.useTempState(true, 2000);
	 * // somewhere in your code:
	 * setValue(false); // value is now false, after 2 seconds it will be reset to true
	 * ```
	 *
	 * Repeated calls cause the timer to reset, meaning each set value will always remain for the full given duration.
	 */
	LeRed.useTempState = (defaultValue, duration) =>
	{
		const [value, setValue] = LeRed.useState(defaultValue);
		const timeoutHandle = LeRed.useRef(null);
		
		return [value, (newValue) =>
		{
			if(timeoutHandle.current)
			{
				clearTimeout(timeoutHandle.current);
			}
			setValue(newValue);
			timeoutHandle.current = setTimeout(() =>
			{
				timeoutHandle.current = null;
				setValue(defaultValue);
			}, duration);
		}];
	};
	
	/**
	 * Allows you to listen to the browser history events (forwards, backwards) and execute a callback on those events.
	 *
	 * You pass 2 functions to it (the callbacks), and it also provides 2 functions (for manually going forwards and backwards).
	 *
	 * Usage:
	 *
	 * ```js
	 * const [goForwards, goBackwards] = LeRed.useHistory(() => console.log('has gone forwards'), () => console.log('has gone backwards'));
	 * ```
	 */
	LeRed.useHistory = (() =>
	{
		let historyStateListeners = [];
		
		globalThis?.addEventListener?.('popstate', () =>
		{
			historyStateListeners.pop()?.callback();
		});
		
		const addListener = (callback) =>
		{
			const id = LeUtils.uniqueId();
			historyStateListeners.push({id, callback});
			return id;
		};
		
		const removeListener = (id) =>
		{
			if(!id)
			{
				return;
			}
			historyStateListeners = historyStateListeners.filter(listener => (listener.id !== id));
		};
		
		return (onForward, onBack) =>
		{
			const remaining = LeRed.useRef(0);
			const id = LeRed.useRef(null);
			
			const goBack = LeRed.useCallback(() =>
			{
				if(remaining.current <= 0)
				{
					return;
				}
				remaining.current--;
				if(remaining.current === 0)
				{
					if(id.current)
					{
						removeListener(id.current);
					}
					id.current = null;
				}
				onBack();
			}, [onBack]);
			
			return [
				() => /** do **/
				{
					LeRed.navigate('#');
					remaining.current++;
					if(remaining.current === 1)
					{
						if(id.current)
						{
							removeListener(id.current);
						}
						id.current = addListener(goBack);
					}
					onForward();
				},
				
				() => /** undo **/
				{
					if(remaining.current > 0)
					{
						LeRed.navigate(-1);
					}
				},
			];
		};
	})();
	
	/**
	 * Similar to {@link LeRed.useHistory}, but this is specifically for toggling a boolean state between true and false. For example, for a modal, which you'd like to be closed when the user goes back in history.
	 *
	 * Example:
	 *
	 * ```js
	 * const [isModalOpen, openModal, closeModal] = LeRed.useHistoryState(false); // you'd open it programmatically using openModal(), afterwards, if the user goes back in history, it will close again
	 * ```
	 *
	 * or, if you'd like it to be true by default:
	 *
	 * ```js
	 * const [isModalOpen, openModal, closeModal] = LeRed.useHistoryState(true); // you'd close it programmatically using closeModal(), afterwards, if the user goes back in history, it will open again
	 * ```
	 */
	LeRed.useHistoryState = (initialState) =>
	{
		const [state, setState] = LeRed.useState(!!initialState);
		const [forwards, backwards] = LeRed.useHistory(() => setState(!initialState), () => setState(!!initialState));
		if(!!initialState)
		{
			return [state, backwards, forwards];
		}
		return [state, forwards, backwards];
	};
	
	/**
	 * Allows you to listen to the hash of the URL (window.location.hash).
	 *
	 * The hash can be useful than the query, as changing the hash will not cause the page to reload. Plus there's a good way to listen to hash changes, using the `hashchange` event, which is lacking for the query.
	 *
	 * Example:
	 *
	 * ```js
	 * const [hashParams, hashString] = LeRed.useHashParams();
	 * ```
	 */
	LeRed.useHashParams = (() =>
	{
		const getHashString = () => (globalThis?.location?.hash?.trim()?.replace(/^#/, '') ?? '');
		const parseHashParams = (hashString) => (new URLSearchParams(hashString));
		
		/**
		 * @returns {[hashParams:URLSearchParams, hashString:string]}
		 */
		return () =>
		{
			const [hashString, setHashString] = LeRed.useState(getHashString);
			const hashParams = LeRed.useMemo(() => parseHashParams(hashString), [hashString]);
			
			LeRed.useEffect(() =>
			{
				const onUrlChanged = () =>
				{
					setHashString(getHashString());
				};
				
				globalThis?.addEventListener?.('hashchange', onUrlChanged);
				return () =>
				{
					globalThis?.removeEventListener?.('hashchange', onUrlChanged);
				};
			}, []);
			
			return [hashParams, hashString];
		};
	})();
	
	/**
	 * Allows you to easily create an <pre><img></pre> url and onError handler that will automatically retry loading the image if it fails.
	 */
	LeRed.useRetryingImageUrl = (url, options) =>
	{
		url = STRING(url);
		const urlHasQ = url.includes('?');
		
		const [imageUrl, setImageUrl] = LeRed.useState(url);
		const retries = LeRed.useRef(0);
		const timeout = LeRed.useRef({remove:() => undefined});
		
		LeRed.useEffect(() =>
		{
			timeout.current.remove();
			retries.current = 0;
			setImageUrl(url);
		}, [url]);
		
		const onImageLoadError = LeRed.useCallback(() =>
		{
			if(retries.current < INT_LAX_ANY(options?.retries, 30))
			{
				const defaultDelay = 100 + (50 * retries.current);
				timeout.current.remove();
				timeout.current = LeUtils.setTimeout(() =>
				{
					setImageUrl(url + (urlHasQ ? '&' : '?') + (options?.queryParam || 'lowentryretryingimgversion') + '=' + (retries.current++));
				}, (typeof options?.delay === 'function') ? INT_LAX_ANY(options?.delay(retries.current), defaultDelay) : (INT_LAX_ANY(options?.delay, defaultDelay)));
			}
		}, [url, options]);
		
		const onImageLoadErrorIgnored = LeRed.useCallback(() =>
		{
		}, []);
		
		if(!url)
		{
			return [url, onImageLoadErrorIgnored];
		}
		return [imageUrl, onImageLoadError];
	};
	
	/**
	 * Allows you to easily convert promises to react hooks.
	 *
	 * The given callable should return promises. The returned promises can be an array, an object, or even a single promise. The returned data of this hook will match the promises it has operated on.
	 *
	 * The given comparingValues can be anything, this is used to detect whether the given promises have changed or not, and so whether new promises have to be generated and executed again.
	 */
	LeRed.usePromises = (callable, comparingValues) =>
	{
		const comparingValuesClone = LeUtils.clone(comparingValues);
		const comparingValuesRef = LeRed.useRef(comparingValuesClone);
		const latestComparingValuesRef = LeRed.useRef();
		latestComparingValuesRef.current = comparingValuesClone;
		
		const [data, setData] = LeRed.useState(null);
		const [loading, setLoading] = LeRed.useState(true);
		const [error, setError] = LeRed.useState(null);
		
		LeRed.useEffect(() =>
		{
			setLoading(true);
			setData(null);
			setError(null);
			
			try
			{
				const promises = callable();
				
				const promisesIsObject = IS_OBJECT(promises) && (typeof promises?.then !== 'function');
				const promisesIsArray = IS_ARRAY(promises);
				
				let promisesKeyed = [];
				if(promisesIsObject || promisesIsArray)
				{
					LeUtils.each(promises, (promise, key) =>
					{
						promisesKeyed.push({promise, key});
					});
				}
				else
				{
					promisesKeyed.push({promise:promises, key:undefined});
				}
				
				let wrappedPromises = [];
				LeUtils.each(promisesKeyed, ({promise, key}) =>
				{
					wrappedPromises.push(promise
						.then(async result => ({result, key})));
				});
				
				Promise.all(wrappedPromises)
					.then(resultObjects =>
					{
						if(promisesIsObject)
						{
							let results = {};
							LeUtils.each(resultObjects, ({result, key}) =>
							{
								results[key] = result;
							});
							return results;
						}
						else if(promisesIsArray)
						{
							let results = [];
							LeUtils.each(resultObjects, ({result, key}) =>
							{
								results[key] = result;
							});
							return results;
						}
						return resultObjects.pop()?.result;
					})
					.then(results =>
					{
						if(!LeUtils.equals(latestComparingValuesRef.current, comparingValuesClone))
						{
							// canceled
							return;
						}
						comparingValuesRef.current = comparingValuesClone;
						setLoading(false);
						setData(results);
						setError(null);
					})
					.catch(error =>
					{
						if(!LeUtils.equals(latestComparingValuesRef.current, comparingValuesClone))
						{
							// canceled
							return;
						}
						comparingValuesRef.current = comparingValuesClone;
						setLoading(false);
						setData(null);
						setError(LeUtils.purgeErrorMessage(error));
					});
				
				return () =>
				{
					LeUtils.each(wrappedPromises, promise =>
					{
						try
						{
							promise?.cancel?.();
						}
						catch(e)
						{
							console.error('Failed to cancel the given promise:', e);
						}
						
						try
						{
							promise?.remove?.();
						}
						catch(e)
						{
							console.error('Failed to remove the given promise:', e);
						}
					});
				};
			}
			catch(error)
			{
				LeUtils.setAnimationFrameTimeout(() =>
				{
					if(!LeUtils.equals(latestComparingValuesRef.current, comparingValuesClone))
					{
						// canceled
						return;
					}
					comparingValuesRef.current = comparingValuesClone;
					setLoading(false);
					setData(null);
					setError(LeUtils.purgeErrorMessage(error));
				});
			}
		}, [comparingValuesClone]);
		
		if(!LeUtils.equals(comparingValuesRef.current, comparingValuesClone))
		{
			return [null, true, null];
		}
		return [data, loading, error];
	};
	
	/**
	 * Allows you to easily obtain external data.
	 */
	LeRed.useExternal = (url, options, responseFunction) =>
	{
		return LeRed.usePromises(() =>
		{
			const createFetch = (urlString) => LeUtils.fetch(STRING(urlString), {retries:3, ...(options ?? {})})
				.then(async response =>
				{
					const data = await responseFunction(response);
					if(typeof options?.verify === 'function')
					{
						await options.verify(data, response);
					}
					return data;
				});
			
			if(IS_OBJECT(url))
			{
				let promises = {};
				LeUtils.each(url, (urlString, key) =>
				{
					promises[key] = createFetch(urlString);
				});
				return promises;
			}
			if(IS_ARRAY(url))
			{
				let promises = [];
				LeUtils.each(url, urlString =>
				{
					promises.push(createFetch(urlString));
				});
				return promises;
			}
			return createFetch(url);
		}, [url, options, responseFunction]);
	};
	
	/**
	 * Allows you to easily obtain external JSON data.
	 */
	LeRed.useExternalJson = (url, options) =>
	{
		const responseFunction = LeRed.useCallback(response => response.json(), []);
		return LeRed.useExternal(url, options, responseFunction);
	};
	
	/**
	 * Allows you to easily obtain external Blob data.
	 */
	LeRed.useExternalBlob = (url, options) =>
	{
		const responseFunction = LeRed.useCallback(response => response.blob(), []);
		return LeRed.useExternal(url, options, responseFunction);
	};
	
	/**
	 * Allows you to easily obtain external ArrayBuffer data.
	 */
	LeRed.useExternalArrayBuffer = (url, options) =>
	{
		const responseFunction = LeRed.useCallback(response => response.arrayBuffer(), []);
		return LeRed.useExternal(url, options, responseFunction);
	};
	
	/**
	 * Allows you to easily obtain external string data.
	 */
	LeRed.useExternalString = (url, options) =>
	{
		const responseFunction = LeRed.useCallback(response => response.text(), []);
		return LeRed.useExternal(url, options, responseFunction);
	};
	
	/**
	 * Allows you to easily obtain external form data.
	 */
	LeRed.useExternalFormData = (url, options) =>
	{
		const responseFunction = LeRed.useCallback(response => response.formData(), []);
		return LeRed.useExternal(url, options, responseFunction);
	};
	
	
	LeRed.Root = LeRed.memo(({store, children, ...other}) =>
	{
		if(ISSET(store))
		{
			store = LeRed.configureStore(store);
			return (<ReactRedux.Provider store={store} children={children} {...other}/>);
		}
		return children;
	});
	
	LeRed.PreloadComponent = (load) =>
	{
		if(typeof window !== 'undefined')
		{
			const promise = load(); // in the browser, start loading already, before it's being rendered in React
			return () => promise;
		}
		return load;
	};
	
	LeRed.LoadComponent = LeRed.memo(({loading, load, ...other}) =>
	{
		const [Component, setComponent] = LeRed.useState(loading ?? null);
		
		LeRed.useEffect(() =>
		{
			(async () =>
			{
				const LoadedComponent = (typeof load === 'function') ? await load() : await load;
				if(!LoadedComponent)
				{
					setComponent(null);
					return;
				}
				setComponent(<LoadedComponent {...other}/>);
			})();
		}, []);
		
		return Component;
	});
	
	
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
