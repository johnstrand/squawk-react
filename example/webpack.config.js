const path = require('path');
const HtmlWebPackPlugin = require("html-webpack-plugin");

module.exports = {
    devServer: {
        historyApiFallback: true,
        inline: true
    },
    entry: path.join(__dirname, '/src/Root.tsx'),
    output: {
        filename: 'app.js',
        path: path.join(__dirname, "/dist"),
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.html$/,
                use: [
                    {
                        loader: "html-loader"
                    }
                ]
            }
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: "./src/index.html",
            filename: "./index.html"
        })
    ]
};