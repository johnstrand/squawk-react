@echo off
cmd /c npm run build
echo Moving to dist folder
cd dist
echo Copying new files
copy * ..\example\node_modules\squawk-react\dist /y
cd ..