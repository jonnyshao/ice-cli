'use strict';
const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');

function getNpmInfo(name, registry) {
  if (!name) return null;
  registry = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registry, name);

  return axios
    .get(npmInfoUrl)
    .then((response) => {
      if (response.status == 200) {
        return response.data;
      }
      return null;
    })
    .catch(Promise.reject);
}

async function getNpmVersions(name, registry) {
  const data = await getNpmInfo(name, registry);
  if (data) {
    return Object.keys(data.versions);
  }
  return [];
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npmmirror.com/';
}

// function getSemverVersions(pkVersion, versions) {
//   return versions.filter((v) => semver.satisfies(v, `^${pkVersion}`));
// }

async function getNpmlatestVersion(pkVersion, pkName, registry) {
  const versions = await getNpmVersions(pkName, registry);
  if (versions && versions.length) {
    return semver.gt(versions[0], versions[1]) ? versions[0] : versions[versions.length - 1];
  }
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmlatestVersion,
  getDefaultRegistry,
};
