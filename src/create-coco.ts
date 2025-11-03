import { glob } from 'glob';
import ejs from 'ejs';
import prompts from 'prompts';
import path from 'path';
import fse from 'fs-extra';
import process from 'process';

async function create(type: 'app' | 'lib') {
    let userCancelled = false;
    const response = await prompts(
        [
            {
                type: 'text',
                name: 'projectName',
                message: '项目名称（在当前目录下新建文件夹，且设置package.json的name）？',
            },
            {
                type: 'text',
                name: 'author',
                message: '作者（package.json的author）？',
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
                type: 'toggle',
                name: 'useTailwindcss',
                message: '是否使用Tailwindcss？',
                initial: false,
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
    const { projectName, author, deleteExistFolder, useTailwindcss } = response;
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

const createApp = () => create('app');
const createLib = () => create('lib');

function cli(command: string, type: string) {
    switch (type) {
        case 'app': {
            createApp();
            break;
        }
        case 'lib': {
            createLib();
            break;
        }
        default: {
            console.warn(`create后面的参数只能是: app 或 lib，当前为: ${type}`);
            break;
        }
    }
}

export { cli };
