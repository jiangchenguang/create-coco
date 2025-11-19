import { glob } from 'glob';
import ejs from 'ejs';
import prompts from 'prompts';
import path from 'path';
import fse from 'fs-extra';
import process from 'process';
import { cliVersion, mvcVersion } from './version';
import generateLibProject from './generate-lib-project';

async function create() {
    let userCancelled = false;
    let tempType = '';
    const response = await prompts(
        [
            {
                type: 'select',
                name: 'type',
                message: '项目类型',
                choices: [
                    { title: '应用', description: '基于前端路由的CSR项目', value: 'app' },
                    { title: '库', description: '可供复用的组件库或工具库项目', value: 'lib' },
                ],
                format: (value: string) => {
                    return tempType = value;
                }
            },
            {
                type: 'text',
                name: 'projectName',
                message: '项目名称（在当前目录下新建文件夹，且设置package.json的name）',
                validate: (value: string) => {
                    if (!value.trim()) {
                        return '项目名称不能为空';
                    } else if (tempType === 'lib' && value === 'dev') {
                        return '当创建库项目时，名称不能是dev';
                    }
                    return true;
                },
            },
            {
                type: (projectName: string) => {
                    const targetDir = path.resolve(process.cwd(), projectName);
                    return fse.pathExistsSync(targetDir) ? 'confirm' : null;
                },
                name: 'deleteExistFolder',
                message: (projectName: string) => {
                    return `当前目录下已经存在${projectName}，确定【删除${projectName}】并继续？`;
                },
                initial: true,
            },
            {
                type: 'select',
                name: 'useTailwindcss',
                message: '是否使用tailwindcss',
                choices: [
                    { title: '是', description: '集成tailwindcss及构建配置', value: true },
                    { title: '否', description: '不集成任何样式库', value: false },
                ],
            },
        ],
        {
            onCancel: () => {
                userCancelled = true;
            },
        }
    );

    if (userCancelled) {
        return;
    }
    const { type, projectName, deleteExistFolder, useTailwindcss } = response;
    const targetDir = path.resolve(process.cwd(), projectName);
    if (deleteExistFolder === false) {
        return;
    } else if (deleteExistFolder) {
        fse.removeSync(targetDir);
    }

    let folder = '';
    switch (type) {
        case 'app': {
            folder = useTailwindcss ? 'app-tailwind' : 'app';
            break;
        }
        case 'lib': {
            folder = 'lib';
            break;
        }
    }
    if (!folder) {
        console.error('指定的模版目录不应该为空，', type);
        return;
    }
    const tempFolderPath = path.resolve(__dirname, '..', 'template', `${folder}`);
    if (!fse.pathExistsSync(tempFolderPath)) {
        console.error('模版目录不存在', tempFolderPath, type);
        return;
    }
    if (type === 'lib') {
        await generateLibProject(process.cwd(), projectName, useTailwindcss);
        return;
    }
    // 复制非ejs文件
    const noEjsFiles = glob.sync(`**/*`, {
        cwd: tempFolderPath,
        ignore: ['**/*.ejs', '**/gitignore'],
        nodir: true,
    });
    for (const file of noEjsFiles) {
        const sourcePath = path.join(tempFolderPath, file);
        const targetPath = path.join(targetDir, file);
        fse.copySync(sourcePath, targetPath);
    }

    // .gitignore文件是通过gitignore文件生成的
    const gitIgnorePath = path.join(tempFolderPath, 'gitignore');
    if (fse.pathExistsSync(gitIgnorePath)) {
        fse.copySync(gitIgnorePath, path.join(targetDir, '.gitignore'));
    }

    // 生成package.json
    const packageJsonEjs = path.resolve(tempFolderPath, 'package.json.ejs');
    const renderedContent = await ejs.renderFile(packageJsonEjs, {
        name: projectName,
        cliVersion,
        mvcVersion,
    });
    await fse.outputFileSync(path.join(targetDir, 'package.json'), renderedContent);
}

function cli() {
    create();
}

// TODO: 添加测试
export { cli };
