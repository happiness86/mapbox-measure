const path = require('path')
const pluginProposalClassProperties = require('@babel/plugin-proposal-class-properties')

module.exports = {
	mode: 'production',
	entry: './src/index.js',
	output: {
		filename: 'index.js',
		path: path.resolve(__dirname, 'dist'),
		library: 'MapboxMeasure',
		libraryTarget: 'umd',
		libraryExport: 'default',
		globalObject: 'this'
	},
	module: {
		rules: [
			{
				test: /\.css$/g,
				use: [
					'style-loader',
					'css-loader'
				]
			},
			{
				test: /\.m?js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env'],
						plugins: ['@babel/plugin-proposal-class-properties']
					}
				}
			}
		]
	}
}
