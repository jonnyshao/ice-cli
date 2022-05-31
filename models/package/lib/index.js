'use strict';

const pkgDir = require('pkg-dir').sync;
const path = require('path');
const pathExists = require('path-exists');
const npminstall = require('npminstall');

const formatPath = require('@ice-cli/format-path');
const { getDefaultRegistry, getNpmlatestVersion } = require('@ice-cli/npm');
class Package {
  constructor(options = {}) {
    // package的路径
    this.targetPath = options.targetPath;
    // cache
    this.storeDir = options.storeDir;
    //  package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;

    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }
  async prepare() {
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmlatestVersion(this.packageName);
    }
    // @ice-cli/init 1.0.0
  }
  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}}`
    );
  }
  //   判断当前Package
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return pathExists(this.cacheFilePathPrefix);
    } else {
      return pathExists(this.targetPath);
    }
  }
  //   安装Package
  async install() {
    await this.prepare();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }
  // 更新Package
  update() {}
  // 获取入口文件路径
  getRootFile() {
    function _getRootPath(targetPath) {
      const dir = pkgDir(targetPath);
      if (dir) {
        // get package.json
        const pkgFile = require(path.resolve(dir, 'package.json'));
        // look for index.js
        if (pkgFile && (pkgFile.main || pkgFile.lib)) {
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }

    if (this.storeDir) {
      return _getRootPath(this.cacheFilePath);
    } else {
      //  package.json directory
      return _getRootPath(this.targetPath);
    }
  }
}

module.exports = Package;
