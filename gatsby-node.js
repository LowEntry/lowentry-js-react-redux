const fs = require('fs');
const babel = require('@babel/core');


exports.pluginOptionsSchema = ({Joi}) =>
{
	return Joi.object({
		import:             Joi.array().items(Joi.string())
			                    .required()
			                    .default(['./src/resources/'])
			                    .description(`A list of files and folders, which will be included in the imports/exports generation.`),
		modify:             Joi.array().items(Joi.string())
			                    .required()
			                    .default(['./src/resources/', './src/pages/'])
			                    .description(`A list of files and folders, which will be updated to automatically import everything that has been exported.`),
		outputPath:         Joi.string()
			                    .default('./imports.js')
			                    .description(`The path of the file that will be generated, this file will contain the import lines.`),
		previousOutputPaths:Joi.array().items(Joi.string())
			                    .default([])
			                    .description(`The previously-used paths of the output files, this is needed to be able to clean them up.`),
		babel:              Joi.object()
			                    .default({})
			                    .description(`The babel options to use when parsing the files (the files need to be parsed to detect what fields they export).`),
		fileExtensionsJs:   Joi.array().items(Joi.string())
			                    .default(['js', 'jsx'])
			                    .description(`The file extensions to consider as JavaScript files.`),
		fileExtensionsOther:Joi.array().items(Joi.string())
			                    .default(['css', 'less', 'sass', 'scss'])
			                    .description(`The file extensions to consider as importable files.`),
	});
};


function purgePath(path)
{
	path = (path + '').replace(/\\/g, '/');
	while(path.endsWith('/'))
	{
		path = path.substring(0, path.length - 1);
	}
	return path;
}

function getAllFiles(path, allFilesList = [])
{
	const stats = fs.statSync(path);
	if(stats.isDirectory())
	{
		const files = fs.readdirSync(path);
		files.forEach(file =>
		{
			getAllFiles(path + '/' + file, allFilesList);
		});
	}
	else if(stats.isFile())
	{
		allFilesList.push(path);
	}
	return allFilesList;
}


function isFileOfType(file, types)
{
	const f = file.toLowerCase();
	return types.some(type => f.endsWith(type.startsWith('.') ? type : '.' + type));
}


function compareFileOrder(a, b)
{
	return _compareFileOrderArray(a.split('/'), b.split('/'));
}

function _compareFileOrderArray(aParts, bParts)
{
	for(let i = 0; i < Math.min(aParts.length, bParts.length); i++)
	{
		const cmp = _compareFileOrderString(aParts[i], bParts[i]);
		if(cmp !== 0)
		{
			return cmp;
		}
	}
	return aParts.length - bParts.length;
}

function _compareFileOrderString(a, b)
{
	const aa = a.toLowerCase();
	const bb = b.toLowerCase();
	if(aa > bb)
	{
		return 1;
	}
	else if(aa === bb)
	{
		return 0;
	}
	return -1;
}


function getFirstLine(code)
{
	code = code.trimStart();
	const firstNewline = code.indexOf('\n');
	return ((firstNewline >= 0) ? code.substring(0, firstNewline) : code).trim();
}


function setFileContentIfDifferent(file, newContent, oldContent = null)
{
	if(oldContent === null)
	{
		try
		{
			oldContent = fs.readFileSync(file, 'utf8');
		}
		catch(e)
		{
			oldContent = '';
		}
	}
	
	if(oldContent.trim() !== newContent.trim())
	{
		fs.writeFileSync(file, newContent);
	}
}

function setFileContentIfFirstLineIsDifferent(file, newContent, oldContent = null)
{
	if(oldContent === null)
	{
		try
		{
			oldContent = fs.readFileSync(file, 'utf8');
		}
		catch(e)
		{
			oldContent = '';
		}
	}
	
	if(getFirstLine(oldContent) !== getFirstLine(newContent))
	{
		fs.writeFileSync(file, newContent);
	}
}


function purgeOutputPath(path)
{
	path = purgePath(path);
	if(!path.endsWith('.js'))
	{
		path += '.js';
	}
	while(path.startsWith('./'))
	{
		path = path.substring(2);
	}
	return path;
}


exports.onPreInit = exports.onPreExtractQueries = ({reporter}, pluginOptions) =>
{
	const outputPath = purgeOutputPath(pluginOptions['outputPath']);
	const previousOutputPaths = (pluginOptions['previousOutputPaths']).map(purgeOutputPath);
	
	
	function getExportedFields(code, codeIsPurged = false)
	{
		try
		{
			const {ast} = babel.transformSync(codeIsPurged ? code : purgeImportedFieldsCode(code), {
				...(pluginOptions['babel']),
				ast:    true,
				code:   false,
				plugins:['@babel/plugin-syntax-jsx', ...(pluginOptions['babel'].plugins ?? [])],
			});
			
			//fs.writeFileSync('./test.json', JSON.stringify(ast?.program?.body ?? [], null, 2));
			return (ast?.program?.body ?? []).filter(node => node.type === 'ExportNamedDeclaration')
				.map(exportNode =>
				{
					const specifiers = exportNode.specifiers?.map(spec => spec?.exported?.name) ?? [];
					const declarations = exportNode.declaration?.declarations?.map(decl => decl?.id?.name) ?? [];
					const declarationsArray = exportNode.declaration?.declarations?.map(decl => decl?.id?.elements?.map(elem => elem?.name) ?? [])?.flatMap(x => x) ?? [];
					const declarationsObject = exportNode.declaration?.declarations?.map(decl => decl?.id?.properties?.map(prop => prop?.value?.name) ?? [])?.flatMap(x => x) ?? [];
					return [...specifiers, ...declarations, ...declarationsArray, ...declarationsObject];
				})
				.flatMap(x => x)
				.filter(x => (typeof x !== 'undefined') && ((!Array.isArray(x) || x.length > 0)));
		}
		catch(e)
		{
			console.error(e);
			return [];
		}
	}
	
	function purgeImportedFieldsCode(code)
	{
		let changed = true;
		const outputPathFiles = [outputPath, ...previousOutputPaths];
		while(changed)
		{
			changed = false;
			
			const newCode = code.trimStart();
			const firstNewline = newCode.indexOf('\n');
			if(firstNewline >= 0)
			{
				const firstLine = newCode.substring(0, firstNewline);
				
				let includes = false;
				outputPathFiles.forEach(outputPathFile =>
				{
					if(!includes)
					{
						includes = firstLine.includes(`./${outputPathFile}';`);
					}
				});
				
				if(includes)
				{
					code = newCode.substring(firstNewline + 1);
					changed = true;
				}
			}
		}
		return code;
	}
	
	
	let importsCode = '';
	let exportedFields = {};
	
	
	function importFile(file)
	{
		if(isFileOfType(file, pluginOptions['fileExtensionsJs']))
		{
			const fields = getExportedFields(fs.readFileSync(file, 'utf8'));
			importsCode += `import {${fields.join(', ')}} from '${file}';\n`;
			fields.forEach(field => exportedFields[field] = true);
		}
		else if(isFileOfType(file, pluginOptions['fileExtensionsOther']))
		{
			importsCode += `import '${file}';\n`;
		}
	}
	
	function modifyFile(file)
	{
		if(isFileOfType(file, pluginOptions['fileExtensionsJs']))
		{
			const code = fs.readFileSync(file, 'utf8');
			const purgedCode = purgeImportedFieldsCode(code);
			
			const fields = getExportedFields(purgedCode, true);
			const levelsDeep = file.split('/').length - 2;
			const importedFieldsCode = `import {${Object.keys(exportedFields).filter(value => !fields.includes(value)).join(', ')}} from './${'../'.repeat(levelsDeep)}${outputPath}';\n`;
			
			const newCode = importedFieldsCode + purgedCode;
			setFileContentIfFirstLineIsDifferent(file, newCode, code);
		}
	}
	
	
	pluginOptions['import']?.forEach(path => getAllFiles(purgePath(path)).sort(compareFileOrder).forEach(importFile));
	setFileContentIfDifferent('./' + outputPath, `${importsCode}\nexport {${Object.keys(exportedFields).join(', ')}};\n`);
	pluginOptions['modify']?.forEach(path => getAllFiles(purgePath(path)).sort(compareFileOrder).forEach(modifyFile));
};