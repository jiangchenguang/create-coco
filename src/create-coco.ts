import { glob } from 'glob';
import ejs from 'ejs';
import prompts from 'prompts';
import path from 'path';
import fse from 'fs-extra';
import process from 'process';

async function create() {
    let userCancelled = false;
    const response = await prompts(
        [
            {
                type: 'select',
                name: 'type',
                message: '项目类型',
                choices: [
                    { title: '应用', description: '基于前端路由的CSR项目', value: 'app' },
                    { title: '库', description: '可供复用的组件库或工具库项目', value: 'lib' }
                ],
            },
            {
                type: 'text',
                name: 'projectName',
                message: '项目名称（在当前目录下新建文件夹，且设置package.json的name）',
                validate: (value: string) => {
                    if (!value.trim()) {
                        return '项目名称不能为空';
                    }
                    return true;
                },
            },
            {
                type: 'text',
                name: 'author',
                message: '作者',
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
                    { title: '否', description: '不集成任何样式库', value: false }
                ]
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
    const { type, projectName, author, deleteExistFolder, useTailwindcss } = response;
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
    // TODO:create-coco的版本号和当前包保持一致；create-coco的版本号先手动维护吧
    const cliVersion = '0.0.1-alpha202511021502';
    const mvcVersion = '0.0.1-alpha202510092123';
    const renderedContent = await ejs.renderFile(packageJsonEjs, {
        name: projectName,
        author,
        cliVersion,
        mvcVersion,
    });
    await fse.outputFileSync(path.join(targetDir, 'package.json'), renderedContent);
}

function cli() {
    create()
}

// TODO: 添加测试
export { cli };
