const path = require('path');
const webpack = require('webpack');
const config = {
    entry: './source/javascripts/index.js',

    output: {
        filename: 'bundle.js',
        path: './source/javascripts'
    },

    module: {
        loaders: [
            {
                test: /\.(js|es6)$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query:{
                    presets: ['es2015']
                }
            }
        ]
    },

    devtool: ['cheap-module-source-map'],

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
            }
        }),
    ],
}

if (process.env.NODE_ENV === 'production') {
    config.plugins.push(
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                screw_ie8: true,
                warnings: false,
            }
        })
    )

} else {
    config.devtool = "#cheap-module-source-map"
}


module.exports = config
