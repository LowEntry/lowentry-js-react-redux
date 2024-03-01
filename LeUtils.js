import FastDeepEqual from 'fast-deep-equal';
import {ISSET, IS_OBJECT, STRING, INT, FLOAT, FLOAT_ANY, INT_LAX} from './LeTypes.js';


export const LeUtils = {
	equals:FastDeepEqual,
	
	getCleanErrorMessage:
		(error) =>
		{
			const message = STRING(((typeof error === 'string') ? error : (error.message ?? JSON.stringify(error))));
			const messageParts = message.split('threw an error:');
			return messageParts[messageParts.length - 1].trim();
		},
	
	/** expects a version string like "1.2.3" or "1.2.3 r0" **/
	parseVersionString:
		(versionString) =>
		{
			if(IS_OBJECT(versionString) && ISSET(versionString?.major) && ISSET(versionString?.minor) && ISSET(versionString?.patch))
			{
				return versionString;
			}
			
			versionString = STRING(versionString).trim();
			const partsVersion = versionString.split(' ')[0].split('-')[0].split('.');
			const major = INT_LAX(partsVersion[0]);
			const minor = INT_LAX(partsVersion[1]);
			const patch = INT_LAX(partsVersion[2]);
			
			const THIS = {
				major:major,
				minor:minor,
				patch:patch,
				
				toString:
					() => major + '.' + minor + '.' + patch,
				
				equals:
					(otherVersion) =>
					{
						otherVersion = LeUtils.parseVersionString(otherVersion);
						return (major === otherVersion.major) && (minor === otherVersion.minor) && (patch === otherVersion.patch);
					},
				
				largerThan:
					(otherVersion) =>
					{
						otherVersion = LeUtils.parseVersionString(otherVersion);
						
						if(major > otherVersion.major)
						{
							return true;
						}
						if(major < otherVersion.major)
						{
							return false;
						}
						
						if(minor > otherVersion.minor)
						{
							return true;
						}
						if(minor < otherVersion.minor)
						{
							return false;
						}
						
						return (patch > otherVersion.patch);
					},
				
				largerThanOrEquals:
					(otherVersion) =>
					{
						otherVersion = LeUtils.parseVersionString(otherVersion);
						
						if(major > otherVersion.major)
						{
							return true;
						}
						if(major < otherVersion.major)
						{
							return false;
						}
						
						if(minor > otherVersion.minor)
						{
							return true;
						}
						if(minor < otherVersion.minor)
						{
							return false;
						}
						
						return (patch >= otherVersion.patch);
					},
				
				smallerThan:
					(otherVersion) => !THIS.largerThanOrEquals(otherVersion),
				
				smallerThanOrEquals:
					(otherVersion) => !THIS.largerThan(otherVersion),
			};
			return THIS;
		},
	
	contains:
		(array, value) =>
		{
			if(!array)
			{
				return false;
			}
			let result = false;
			value = STRING(value);
			LeUtils.each(array, (val) =>
			{
				if(STRING(val) === value)
				{
					result = true;
					return false;
				}
			});
			return result;
		},
	
	containsCaseInsensitive:
		(array, value) =>
		{
			if(!array)
			{
				return false;
			}
			let result = false;
			value = STRING(value).toLowerCase();
			LeUtils.each(array, (val) =>
			{
				if(STRING(val).toLowerCase() === value)
				{
					result = true;
					return false;
				}
			});
			return result;
		},
	
	each:
		(elements, callback, optionalSkipHasOwnPropertyCheck = false) =>
		{
			if((elements !== null) && (typeof elements !== 'undefined'))
			{
				if(Array.isArray(elements))
				{
					for(let index = 0; index < elements.length; index++)
					{
						if(callback.call(elements[index], elements[index], index) === false)
						{
							break;
						}
					}
				}
				else if((typeof elements === 'object') || (typeof elements === 'function'))
				{
					for(let index in elements)
					{
						if((optionalSkipHasOwnPropertyCheck === true) || Object.prototype.hasOwnProperty.call(elements, index))
						{
							if(callback.call(elements[index], elements[index], index) === false)
							{
								break;
							}
						}
					}
				}
				else
				{
					console.warn('Executed LeUtils.each() on an invalid type: [' + (typeof elements) + ']', elements);
				}
			}
			return elements;
		},
	
	filter:
		(elements, callback, optionalSkipHasOwnPropertyCheck = false) =>
		{
			if((elements !== null) && (typeof elements !== 'undefined'))
			{
				if(Array.isArray(elements))
				{
					let result = [];
					for(let index = 0; index < elements.length; index++)
					{
						if(callback.call(elements[index], elements[index], index) !== false)
						{
							result.push(elements[index]);
						}
					}
					return result;
				}
				else if((typeof elements === 'object') || (typeof elements === 'function'))
				{
					let result = {};
					for(let index in elements)
					{
						if((optionalSkipHasOwnPropertyCheck === true) || Object.prototype.hasOwnProperty.call(elements, index))
						{
							if(callback.call(elements[index], elements[index], index) !== false)
							{
								result[index] = elements[index];
							}
						}
					}
					return result;
				}
				else
				{
					console.warn('Executed LeUtils.filter() on an invalid type: [' + (typeof elements) + ']', elements);
				}
			}
			return elements;
		},
	
	map:
		(elements, callback, optionalSkipHasOwnPropertyCheck = false) =>
		{
			if((elements !== null) && (typeof elements !== 'undefined'))
			{
				if(Array.isArray(elements))
				{
					let result = [];
					for(let index = 0; index < elements.length; index++)
					{
						result[index] = callback.call(elements[index], elements[index], index);
					}
					return result;
				}
				else if((typeof elements === 'object') || (typeof elements === 'function'))
				{
					let result = {};
					for(let index in elements)
					{
						if((optionalSkipHasOwnPropertyCheck === true) || Object.prototype.hasOwnProperty.call(elements, index))
						{
							result[index] = callback.call(elements[index], elements[index], index);
						}
					}
					return result;
				}
				else
				{
					console.warn('Executed LeUtils.map() on an invalid type: [' + (typeof elements) + ']', elements);
				}
			}
			return elements;
		},
	
	mapToArray:
		(elements, callback, optionalSkipHasOwnPropertyCheck = false) =>
		{
			let result = [];
			if((elements !== null) && (typeof elements !== 'undefined'))
			{
				if(Array.isArray(elements))
				{
					for(let index = 0; index < elements.length; index++)
					{
						result.push(callback.call(elements[index], elements[index], index));
					}
				}
				else if((typeof elements === 'object') || (typeof elements === 'function'))
				{
					for(let index in elements)
					{
						if((optionalSkipHasOwnPropertyCheck === true) || Object.prototype.hasOwnProperty.call(elements, index))
						{
							result.push(callback.call(elements[index], elements[index], index));
						}
					}
				}
				else
				{
					console.warn('Executed LeUtils.mapToArray() on an invalid type: [' + (typeof elements) + ']', elements);
				}
			}
			return result;
		},
	
	mapToArraySorted:
		(elements, comparator, callback, optionalSkipHasOwnPropertyCheck = false) =>
		{
			const keys = LeUtils.sortKeys(elements, comparator, optionalSkipHasOwnPropertyCheck);
			let result = [];
			for(let i = 0; i < keys.length; i++)
			{
				result.push(callback.call(elements[keys[i]], elements[keys[i]], keys[i]));
			}
			return result;
		},
	
	sortKeys:
		(elements, comparator, optionalSkipHasOwnPropertyCheck = false) =>
		{
			let keys = [];
			if((elements !== null) && (typeof elements !== 'undefined'))
			{
				if(Array.isArray(elements))
				{
					for(let index = 0; index < elements.length; index++)
					{
						keys.push(index);
					}
				}
				else if((typeof elements === 'object') || (typeof elements === 'function'))
				{
					for(let index in elements)
					{
						if((optionalSkipHasOwnPropertyCheck === true) || Object.prototype.hasOwnProperty.call(elements, index))
						{
							keys.push(index);
						}
					}
				}
				else
				{
					console.warn('Executed LeUtils.sortKeys() on an invalid type: [' + (typeof elements) + ']', elements);
				}
			}
			keys.sort((a, b) => comparator(elements[a], elements[b]));
			return keys;
		},
	
	compare:
		(a, b) =>
		{
			if(a < b)
			{
				return -1;
			}
			if(a > b)
			{
				return 1;
			}
			return 0;
		},
	
	compareNumbers:
		(a, b) => a - b,
	
	compareNumericStrings:
		(a, b) =>
		{
			a = STRING(a).trim();
			b = STRING(b).trim();
			if(a.length === b.length)
			{
				return (a < b) ? -1 : ((a > b) ? 1 : 0);
			}
			return (a.length < b.length) ? -1 : 1;
		},
	
	isEmptyObject:
		(obj) =>
		{
			// noinspection LoopStatementThatDoesntLoopJS
			for(let name in obj)
			{
				return false;
			}
			return true;
		},
	
	getObjectFieldsCount:
		(obj) =>
		{
			let count = 0;
			for(let name in obj)
			{
				count++;
			}
			return count;
		},
	
	flattenArray:
		(() =>
		{
			const flattenArrayRecursive = (result, array) =>
			{
				if(!Array.isArray(array))
				{
					result.push(array);
					return;
				}
				array.forEach((entry) =>
				{
					flattenArrayRecursive(result, entry);
				});
			};
			
			return (array) =>
			{
				if(!Array.isArray(array))
				{
					return [array];
				}
				let result = [];
				array.forEach((entry) =>
				{
					flattenArrayRecursive(result, entry);
				});
				return result;
			};
		})(),
	
	isGeneratorFunction:
		(() =>
		{
			const GeneratorFunction = function* ()
			{
			}.constructor;
			
			const AsyncGeneratorFunction = async function* ()
			{
			}.constructor;
			
			const RegularFunction = function()
			{
			}.constructor;
			
			const PossibleGeneratorFunctionNames = Array.from(new Set(['GeneratorFunction', 'AsyncFunction', 'AsyncGeneratorFunction', GeneratorFunction.name, GeneratorFunction.displayName, AsyncGeneratorFunction.name, AsyncGeneratorFunction.displayName])).filter(function(element)
			{
				return (element && (element !== RegularFunction.name) && (element !== RegularFunction.displayName));
			});
			
			return (func) =>
			{
				if(!func)
				{
					return false;
				}
				const constructor = func.constructor;
				if(!constructor)
				{
					return false;
				}
				return ((constructor.name && PossibleGeneratorFunctionNames.includes(constructor.name)) || (constructor.displayName && PossibleGeneratorFunctionNames.includes(constructor.displayName)));
			};
		})(),
	
	setInterval:
		(callback, intervalMs, fireImmediately) =>
		{
			intervalMs = FLOAT_ANY(intervalMs, 1000);
			
			if(fireImmediately)
			{
				try
				{
					callback(0);
				}
				catch(e)
				{
					console.error(e);
				}
			}
			
			let lastTime = performance.now();
			let handler = setInterval(() =>
			{
				let currentTime = performance.now();
				try
				{
					callback((currentTime - lastTime) / 1000);
				}
				catch(e)
				{
					console.error(e);
				}
				lastTime = currentTime;
			}, intervalMs);
			
			return {
				remove:
					() =>
					{
						if(handler !== null)
						{
							clearInterval(handler);
							handler = null;
						}
					},
			};
		},
	
	setAnimationFrameInterval:
		(callback, intervalFrames, fireImmediately) =>
		{
			intervalFrames = INT(intervalFrames);
			
			if(fireImmediately)
			{
				try
				{
					callback(0);
				}
				catch(e)
				{
					console.error(e);
				}
			}
			
			let run = true;
			let requestAnimationFrameId = null;
			let lastTime = performance.now();
			let frames = intervalFrames;
			const tick = () =>
			{
				if(run)
				{
					if(frames <= 0)
					{
						let currentTime = performance.now();
						try
						{
							callback((currentTime - lastTime) / 1000);
						}
						catch(e)
						{
							console.error(e);
						}
						lastTime = currentTime;
						frames = intervalFrames;
					}
					frames--;
					
					if(run)
					{
						requestAnimationFrameId = window?.requestAnimationFrame(tick);
					}
				}
			};
			window?.requestAnimationFrame(tick);
			
			return {
				remove:
					() =>
					{
						run = false;
						if(requestAnimationFrameId !== null)
						{
							cancelAnimationFrame(requestAnimationFrameId);
							requestAnimationFrameId = null;
						}
					},
			};
		},
	
	setAnimationFrameTimeout:
		(callback, frames) =>
		{
			frames = INT(frames);
			
			let run = true;
			let requestAnimationFrameId = null;
			const tick = () =>
			{
				if(run)
				{
					if(frames <= 0)
					{
						run = false;
						requestAnimationFrameId = null;
						try
						{
							callback();
						}
						catch(e)
						{
							console.error(e);
						}
						return;
					}
					frames--;
					requestAnimationFrameId = window?.requestAnimationFrame(tick);
				}
			};
			tick();
			
			return {
				remove:
					() =>
					{
						run = false;
						if(requestAnimationFrameId !== null)
						{
							cancelAnimationFrame(requestAnimationFrameId);
							requestAnimationFrameId = null;
						}
					},
			};
		},
	
	capitalize:
		(string) =>
		{
			string = STRING(string).trim();
			if(string.length <= 0)
			{
				return string;
			}
			return string.charAt(0).toUpperCase() + string.slice(1);
		},
	
	stopPropagation:
		(callback) =>
		{
			return (event) =>
			{
				event.stopPropagation();
				if(typeof callback !== 'undefined')
				{
					callback();
				}
			};
		},
	
	/**
	 * Returns true if the user is on a smartphone device (mobile).
	 * Will return false if the user is on a tablet or on a desktop.
	 *
	 * In short:
	 * - Mobile: True
	 * - Tablet: False
	 * - Desktop: False
	 */
	platformIsMobile:
		() =>
		{
			// noinspection JSDeprecatedSymbols, JSUnresolvedReference
			/** navigator.userAgentData.mobile doesn't return the correct value on some platforms, so this is a work-around, code from:  http://detectmobilebrowsers.com **/
			const a = STRING(window?.navigator?.userAgent || window?.navigator?.vendor || window?.opera || '');
			const b = a.substring(0, 4);
			return !!(
				/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series([46])0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i
					.test(a) ||
				/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br([ev])w|bumb|bw-([nu])|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do([cp])o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly([-_])|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-([mpt])|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c([- _agpst])|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac([ \-/])|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja([tv])a|jbro|jemu|jigs|kddi|keji|kgt([ /])|klon|kpt |kwc-|kyo([ck])|le(no|xi)|lg( g|\/([klu])|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t([- ov])|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30([02])|n50([025])|n7(0([01])|10)|ne(([cm])-|on|tf|wf|wg|wt)|nok([6i])|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan([adt])|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c([-01])|47|mc|nd|ri)|sgh-|shar|sie([-m])|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel([im])|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c([- ])|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i
					.test(b)
			);
		},
	
	/**
	 * Returns true if the user has a cursor (mouse, touchpad, etc).
	 * In this context, a cursor is defined as an input device that can hover over elements without necessarily interacting with them.
	 */
	platformHasCursor:
		() =>
		{
			return !LeUtils.platformIsMobile() && !window?.matchMedia('(any-hover: none)')?.matches;
		},
	
	promiseTimeout:
		(timeoutMs) =>
		{
			timeoutMs = FLOAT(timeoutMs);
			if(timeoutMs <= 0)
			{
				return new Promise(resolve => resolve());
			}
			return new Promise(resolve => setTimeout(resolve, timeoutMs));
		},
	
	endsWithAny:
		(string, endingCharsStringOrArray) =>
		{
			string = STRING(string);
			let endingCharsArray;
			if(Array.isArray(endingCharsStringOrArray))
			{
				endingCharsArray = endingCharsStringOrArray;
			}
			else
			{
				endingCharsArray = STRING(endingCharsStringOrArray).split('');
			}
			let result = false;
			LeUtils.each(endingCharsArray, (chars) =>
			{
				if(string.endsWith(STRING(chars)))
				{
					result = true;
					return false;
				}
			});
			return result;
		},
	
	startsWithAny:
		(string, startingCharsStringOrArray) =>
		{
			string = STRING(string);
			let startingCharsArray;
			if(Array.isArray(startingCharsStringOrArray))
			{
				startingCharsArray = startingCharsStringOrArray;
			}
			else
			{
				startingCharsArray = STRING(startingCharsStringOrArray).split('');
			}
			let result = false;
			LeUtils.each(startingCharsArray, (chars) =>
			{
				if(string.startsWith(STRING(chars)))
				{
					result = true;
					return false;
				}
			});
			return result;
		},
	
	trimEnd:
		(string, trimCharsStringOrArray) =>
		{
			string = STRING(string);
			let endingCharsArray;
			if(Array.isArray(trimCharsStringOrArray))
			{
				endingCharsArray = trimCharsStringOrArray;
			}
			else
			{
				endingCharsArray = STRING(trimCharsStringOrArray).split('');
			}
			const trimChars = (chars) =>
			{
				chars = STRING(chars);
				if(string.endsWith(chars))
				{
					string = string.substring(0, string.length - chars.length);
					run = true;
				}
			};
			let run = true;
			while(run)
			{
				run = false;
				LeUtils.each(endingCharsArray, trimChars);
			}
			return string;
		},
	
	trimStart:
		(string, trimCharsStringOrArray) =>
		{
			string = STRING(string);
			let startingCharsArray;
			if(Array.isArray(trimCharsStringOrArray))
			{
				startingCharsArray = trimCharsStringOrArray;
			}
			else
			{
				startingCharsArray = STRING(trimCharsStringOrArray).split('');
			}
			const trimChars = (chars) =>
			{
				chars = STRING(chars);
				if(string.startsWith(chars))
				{
					string = string.substring(chars.length);
					run = true;
				}
			};
			let run = true;
			while(run)
			{
				run = false;
				LeUtils.each(startingCharsArray, trimChars);
			}
			return string;
		},
	
	trim:
		(string, trimCharsStringOrArray) => LeUtils.trimEnd(LeUtils.trimStart(string, trimCharsStringOrArray), trimCharsStringOrArray),
	
	cleanupSentence:
		(sentence) =>
		{
			sentence = LeUtils.trimEnd(STRING(sentence).trim(), '.: \r\n\t');
			sentence += (LeUtils.endsWithAny(sentence, '!?;') ? '' : '.');
			return sentence;
		},
	
	increaseNumericStringByOne:
		(string) =>
		{
			if(typeof string !== 'string')
			{
				string = '' + string;
				for(let i = string.length - 1; i >= 0; i--)
				{
					const c = string.charAt(i);
					if((c < '0') || (c > '9'))
					{
						return '1';
					}
				}
			}
			if(string === '')
			{
				return '1';
			}
			for(let i = string.length - 1; i >= 0; i--)
			{
				let c = string.charAt(i);
				if((c < '0') || (c > '9'))
				{
					return '1';
				}
				if(c < '9')
				{
					c++;
					string = string.substring(0, i) + c + string.substring(i + 1);// string[i] = (char + 1);
					break;
				}
				string = string.substring(0, i) + '0' + string.substring(i + 1);// string[i] = '0';
			}
			if(string.charAt(0) === '0')
			{
				string = '1' + string;
			}
			return string;
		},
	
	uniqueId:
		(() =>
		{
			let previousUniqueIdsTime = null;
			let previousUniqueIds = {};
			
			const generateUniqueId = () =>
			{
				let now;
				try
				{
					// noinspection JSDeprecatedSymbols
					now = (performance.timeOrigin || performance.timing.navigationStart) + performance.now();
					if(typeof now !== 'number')
					{
						throw new Error();
					}
				}
				catch(e)
				{
					now = (Date.now ? Date.now() : (new Date()).getTime());
				}
				
				return {
					time:now,
					id:  (now + '_' + (Math.random() + '').substring(2)).replace(/\D/g, '_'),
				};
			};
			
			return () =>
			{
				while(true)
				{
					const result = generateUniqueId();
					if(previousUniqueIdsTime !== result.time)
					{
						previousUniqueIdsTime = result.time;
						previousUniqueIds = {[result.id]:true};
						return result.id;
					}
					else if(previousUniqueIds[result.id] !== true)
					{
						previousUniqueIds[result.id] = true;
						return result.id;
					}
				}
			};
		})(),
	
	getEmptyImageSrc:
		() =>
		{
			// noinspection SpellCheckingInspection
			return 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
		},
};
