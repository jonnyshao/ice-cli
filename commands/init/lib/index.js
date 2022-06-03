'use strict';

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const userHome = require('user-home');
const ejs = require('ejs');
const glob = require('glob');

const Package = require('@ice-cli/package');
const Command = require('@ice-cli/command');
const { createSpinner, sleep, execShellAsync } = require('@ice-cli/utils');
const log = require('@ice-cli/log');
const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';
const WHITE_COMMAND = ['npm', 'cnpm'];
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || '';
    this.force = !!this._cmd.force;

    log.verbose('projectName:', this.projectName);
    log.verbose('force:', this.force);
  }
  async prepare() {
    // 目录是否存在
    const template = await getProjectTemplate();
    if (!template && template.length) {
      throw new Error('项目模板不存在');
    }

    this.template = template;
    // 是否强制更新
    // 选择创建项目或组件
    // 获取项目的基本信息
    const localPath = process.cwd();
    if (!this.ifCwdIsEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        ifContinue = (
          await inquirer.prompt({
            type: 'confirm',
            name: 'ifContinue',
            default: false,
            message: '当前文件夹不为空，是否继续创建？',
          })
        ).ifContinue;

        if (!ifContinue) return;
      }
      if (ifContinue || this.force) {
        // 二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '确认清空当前目录下的所有文件？',
        });
        confirmDelete && fse.emptyDirSync(localPath);
      }
    }
    return this.getProjectInfo();
  }
  async getProjectInfo() {
    function checkProjectName(name) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(name);
    }
    let projectInfo = {};
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选初始化类型',
      default: TYPE_PROJECT,
      choices: [
        { name: '项目', value: TYPE_PROJECT },
        { name: '组件', value: TYPE_COMPONENT },
      ],
    });
    // 获取项目基本信息
    const projectNamePrompt = {
      type: 'input',
      name: 'projectName',
      message: '请输入项目名称',
      default: '',
      validate(name) {
        //  1.首字母和尾字母必须为英文字符
        const done = this.async();
        // 2. 属字符为为英文或数字
        setTimeout(() => {
          if (!checkProjectName(name)) {
            done('项目名称不合法，请重新输入');
            return;
          }
          done(null, true);
        });
        return;
      },
    };

    const projectPrompt = [];
    if (checkProjectName(this.projectName)) {
      projectInfo.projectName = this.projectName;
    } else {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push({
      type: 'input',
      name: 'version',
      message: '请输入项目版本',
      default: '1.0.0',
      validate: (v) => !!semver.valid(v),
      filter: function (v) {
        return semver.valid(v) ? semver.valid(v) : v;
      },
    });
    projectPrompt.push({
      type: 'list',
      name: 'projectTemplate',
      message: '请选择项目模板',
      choices: this.creatTemplateChoice(),
    });
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    }
    if (projectInfo.projectName) {
      projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
    }
    return projectInfo;
  }
  ifCwdIsEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);

    fileList = fileList.filter((file) => {
      return !file.startsWith('.') && file != 'node_modules';
    });

    return fileList.length <= 0;
  }
  creatTemplateChoice() {
    return this.template.map((item) => ({
      name: item.name,
      value: item.npmName,
    }));
  }
  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose('projectInfo', projectInfo);
        this.projectInfo = projectInfo;
        // 2. 下载模板
        await this.downloadTemplate();
        // 3. 安装模板
        await this.installTemplate();
      }
    } catch (error) {
      log.error(error.message);
    }
  }
  async ejsRender(options) {
    const dir = process.cwd();

    return new Promise((resolve, reject) => {
      glob(
        '**',
        {
          cwd: dir,
          ignore: options.ignore || '',
          nodir: true,
        },
        (err, files) => {
          if (err) reject(err);
          Promise.all(
            files.map((file) => {
              const filePath = path.join(dir, file);
              return new Promise((resolveFile, rejectFile) => {
                ejs.renderFile(filePath, this.projectInfo, (err, result) => {
                  if (err) {
                    rejectFile(err);
                  } else {
                    fse.writeFileSync(filePath, result);
                    resolveFile(result);
                  }
                });
              });
            })
          )
            .then(resolve)
            .catch(reject);
        }
      );
    });
  }
  async installTemplate() {
    if (!this.templateInfo) {
      throw new Error('项目模板信息不存在！');
    }

    this.templateInfo.type ||= TEMPLATE_TYPE_NORMAL;
    log.verbose('templateInfo', this.templateInfo);
    if (this.templateInfo.type == TEMPLATE_TYPE_NORMAL) {
      await this.installNormalTemplate();
      // 自定义
    } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
      await this.installCustomTemplate();
    } else {
      throw new Error('模板类型不存在！');
    }
  }
  checkCommand(cmd) {
    return {
      checked: WHITE_COMMAND.includes(cmd),
      cmd,
    };
  }
  async execCommand(command, spinner) {
    let installResult;
    if (command) {
      try {
        command = command.split(' ');
        const { cmd, checked } = this.checkCommand(command[0]);
        if (!checked) {
          spinner.start();
          spinner.fail(cmd + ' 不是有效的命令');
          spinner.stop();
          return;
        }
        const args = command.slice(1);

        installResult = await execShellAsync(cmd, args, {
          stdio: 'inherit',
          cwd: process.cwd(),
        });

        return installResult;
      } catch (error) {
        throw error;
      }
    }
  }
  async installNormalTemplate() {
    const spinner = createSpinner('正在安装模板...');
    await sleep();
    const targetPath = process.cwd();
    try {
      const templatePath = path.resolve(this.templatePkg.cacheFilePath, 'template');
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (error) {
      throw error;
    } finally {
      if (fse.pathExists(targetPath)) {
        spinner.succeed('模板安装完成');
      }
      spinner.stop();
    }
    const ignore = ['node_modules/**', 'public/**'];
    await this.ejsRender({ ignore });
    // 依赖安装
    let { installCommand, startCommand } = this.templateInfo;
    let installResult;
    if (installCommand) {
      installResult = await this.execCommand(installCommand, spinner);
    }
    if (startCommand && installResult == 0) {
      await this.execCommand(startCommand, spinner);
    }
  }
  async installCustomTemplate() {}
  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find((item) => item.npmName === projectTemplate);

    const targetPath = path.resolve(userHome, '.ice-cli', 'template');
    const storeDir = path.resolve(userHome, '.ice-cli', 'template', 'node_modules');
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templatePkg = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });

    if (!(await templatePkg.exists())) {
      const spinner = createSpinner('正在下载模板...');
      try {
        await templatePkg.install();
        await sleep();
        spinner.succeed('下载模板完成');
      } catch (error) {
        throw error;
      } finally {
        spinner.stop();
      }
    } else {
      const spinner = createSpinner('正在更新模板...');
      try {
        await templatePkg.update();
        await sleep();
        spinner.succeed('更新模板成功');
      } catch (error) {
        throw error;
      } finally {
        spinner.stop();
      }
    }
    this.templatePkg = templatePkg;

    log.verbose('templatePkg', templatePkg);
  }
}

function init(argv) {
  return new InitCommand(argv);
}
module.exports = init;
module.exports.InitCommand = InitCommand;
