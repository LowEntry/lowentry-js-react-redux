import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import url from '@rollup/plugin-url';
import execute from 'rollup-plugin-execute';


import path from 'path';
import fse from 'fs-extra';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


fse.emptyDirSync('build');
fse.emptyDirSync('dist');
fse.copySync('src', 'dist/src');


export default {
	input:  {
		'index':'./dist/src/index.js',
	},
	output: {
		dir:           'dist',
		format:        'esm',
		entryFileNames:'[name].js',
		sourcemap:     true,
		exports:       'named',
	},
	plugins:[
		peerDepsExternal(),
		resolve(),
		commonjs(),
		babel({
			babelHelpers:'runtime',
			exclude:     'node_modules/**',
			presets:     [
				'@babel/preset-env',
				'@babel/preset-react',
			],
			plugins:     [
				'@babel/plugin-transform-runtime',
			],
		}),
		postcss({
			plugins:[
				autoprefixer(),
				cssnano(),
			],
			inject: true,
		}),
		url(),
		execute(['npx tsc', 'npx api-extractor run'], true),
	],
};
