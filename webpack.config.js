'use strict';
var webpack = require('webpack');
var path = require('path');

let babelLoader = {
    loader: "babel-loader",
    options: {
        cacheDirectory: true,
    },
}

module.exports = {
    // Add source map support
    devtool: "#cheap-source-map",
    entry: "./client.js",
    output: {
        path: __dirname,
        filename: "static/bundle.js"
    },
    resolve: {
        extensions: ['.js', '.marko'],
        modules: ['./', 'node_modules']
    },
    module: {
        rules: [
            {
                test: /\.(js)$/,
                exclude: /node_modules\/(?![marko])/,
                use: [babelLoader],
            },
            {
                test: /\.marko$/,
                use: [babelLoader, "marko-loader"],
            } 
        ],
    },
    plugins: [
    ],
    devServer: {
        disableHostCheck: true,
        host: '0.0.0.0',
        port: 3091,
        contentBase: [__dirname],
    },
};
