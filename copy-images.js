const path = require("path");
const fs = require("fs");
const fse = require('fs-extra');

const srcDir = `src/img`;
const destDir = `dist/img`;
                              
// To copy a folder or file  
fse.copySync(srcDir, destDir, {overwrite: true}, function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log("success!");
  }
});