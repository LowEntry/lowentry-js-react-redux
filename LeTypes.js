export const ISSET = (value) => (typeof value !== 'undefined') && (value !== null);

export const IS_ARRAY = (value) => Array.isArray(value);
export const ARRAY = (value) => IS_ARRAY(value) ? value : ((typeof value !== 'undefined') ? [value] : []);

export const IS_OBJECT = (value) => (typeof value === 'object') && (value !== null) && !Array.isArray(value);
export const OBJECT = (value) => IS_OBJECT(value) ? value : {};

export const STRING = (value) => ISSET(value) ? ('' + value) : '';
export const STRING_ANY = (...values) =>
{
	for(let value of values)
	{
		if(ISSET(value))
		{
			return '' + value;
		}
	}
	return '';
};

export const INT = (value) => Math.round(FLOAT(value));
export const INT_ANY = (...values) => Math.round(FLOAT_ANY(...values));

export const FLOAT = (value) =>
{
	const v = +value;
	if(!isNaN(v))
	{
		return v;
	}
	return 0;
};
export const FLOAT_ANY = (...values) =>
{
	for(let value of values)
	{
		if(value !== null)
		{
			const v = +value;
			if(!isNaN(v))
			{
				return v;
			}
		}
	}
	return 0;
};

export const INT_LAX = (value) => Math.round(FLOAT_LAX(value));
export const INT_LAX_ANY = (...values) => Math.round(FLOAT_LAX_ANY(...values));

export const FLOAT_LAX = (value) =>
{
	const v = parseFloat(value);
	if(!isNaN(v))
	{
		return v;
	}
	return 0;
};
export const FLOAT_LAX_ANY = (...values) =>
{
	for(let value of values)
	{
		if(value !== null)
		{
			const v = parseFloat(value);
			if(!isNaN(v))
			{
				return v;
			}
		}
	}
	return 0;
};
