/**
 * 生成 lib 库对应的项目结构
 */
import { glob } from 'glob';
import ejs from 'ejs';
import fse from 'fs-extra';
import * as path from 'path';
import { renameSync } from 'fs';
import { cliVersion, mvcVersion } from './version';

const placeholderProjectName = '[project-name]';
const devProjectName = 'dev';

/**
 * @param targetDir 在这个目录下新建一个projectName的文件夹，而不是这个目录是代码仓库根目录
 * @param projectName 指定的项目名称，也作为文件夹名称
 * @param useTailwindcss 是否使用tailwindcss
 */
async function generateLibProject(
    targetDir: string,
    projectName: string,
    useTailwindcss: boolean,
) {
    const targetProjectDir = path.join(targetDir, projectName);
    const templateFolder = path.resolve(__dirname, '..', 'template', useTailwindcss ? 'lib-tailwind' : 'lib');
    // 复制非ejs文件
    const noEjsFiles = glob.sync(`**/*`, {
        cwd: templateFolder,
        ignore: ['**/*.ejs', '**/gitignore'],
        nodir: true,
    });
    for (const file of noEjsFiles) {
        const sourcePath = path.join(templateFolder, file);
        const targetPath = path.join(targetProjectDir, file);
        fse.copySync(sourcePath, targetPath);
    }

    // .gitignore文件是通过gitignore文件生成的
    const gitIgnorePath = path.join(templateFolder, 'gitignore');
    if (fse.pathExistsSync(gitIgnorePath)) {
        fse.copySync(gitIgnorePath, path.join(targetProjectDir, '.gitignore'));
    }

    const ejsFiles = glob.sync(`**/*.ejs`, {
        cwd: templateFolder,
        nodir: true,
    });
    for (const file of ejsFiles) {
        const ejsPath = path.join(templateFolder, file);
        const renderedContent = await ejs.renderFile(ejsPath, {
            name: projectName,
            cliVersion,
            mvcVersion,
        });
        const outputFile = file.replace(/\.ejs$/, '')
        const targetPath = path.join(targetProjectDir, outputFile);
        await fse.outputFileSync(targetPath, renderedContent);
    }

    // 重命名
    renameSync(
        path.join(targetProjectDir, 'packages', placeholderProjectName),
        path.join(targetProjectDir, 'packages', projectName),
    )
}

export default generateLibProject;