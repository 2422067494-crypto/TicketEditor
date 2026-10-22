# TicketEditor

火车票票面排版编辑器。Electron 桌面外壳 + 本地 Flask 服务，前端为静态页面，可在 Windows 上直接运行或打包为免安装版本。

使用许可见 [LICENSE.txt](LICENSE.txt)：非商业免费使用，可学习与本地修改，禁止售卖、禁止伪造票据。票面底纹素材另有 [票面底纹LICENSE-许可协议.txt](票面底纹LICENSE-许可协议.txt)。

## 目录结构

```
main.js               Electron 主进程（启动本地 Python 服务、创建窗口、版本检查）
preload.js            预加载脚本，向渲染进程暴露受控接口
ticketeditor.html     主界面
analysis.py           分析服务（票面渲染、Playwright 截图工作线程）
data.py               数据服务（站点数据、Socket 通信、图片处理）
templates/            票面模板（2009 版 / 2015 版）
static/               前端脚本、样式、字体与票面底纹素材
icon/                 应用图标源文件（png / psd）
build/icon.ico        打包用图标
```

运行时目录 `ticketeditor/`（配置、日志、用户资料）由程序自动生成，不纳入版本管理。

## 本地开发

需要 Node.js 18+ 与 Python 3.10+。

```bash
npm install

pip install -r requirements.txt
python -m playwright install chromium   # analysis 服务截图需要

npm start          # 若未配置 start 脚本，可用: npx electron .
```

## 打包

```bash
npm run build
```

产物在 `dist/win-unpacked/`，`asar` 已关闭，`extraResources` 会把 `analysis.py`、`data.py`、`ticketeditor.html`、`static`、`templates`、`python` 复制到 `resources/` 下。

打包前需将便携版 Python 运行时放到 `python/`（该目录体积约 280 MB，不纳入版本管理）。若不需要内置浏览器内核，可去掉 `playwright` 相关依赖并关闭 `analysis.py` 的自动工作线程。

## 日常更新

改完代码，在项目根目录执行：

```bash
git add -A
git commit -m "说明这次改了什么"
git push
```

不习惯命令行可以用 GitHub Desktop 打开本目录，左下角填提交说明点 Commit，再点右上角 Push。

## 发布版本

把打包好的程序放到 Releases 页面供人下载：

```powershell
.\scripts\release.ps1 -Version 1.3.1
```

脚本会依次构建、检查打包结果里没有不可再分发的字体、压缩成 `TicketEditor-v1.3.1.zip`、打标签并上传到 Release。

也可以手动做：在仓库网页进入 Releases → Draft a new release，填版本号后把 zip 拖进去。

`dist/` 和发版用的 zip 都不进版本库，二进制文件只走 Release。

## 素材与字体授权

`static/` 内的字体均为可免费商用的开源字体或自制字体。华文行楷不随仓库分发，运行时调用 Windows 预装字体（`华文行楷` / `STKaiti` / `Kaiti SC` 依次回退），非 Windows 环境会退到系统衬线体。

票面底纹图片另受 `票面底纹LICENSE-许可协议.txt` 约束，再分发或商用前请确认授权范围。

## 说明

本项目生成的是排版样张，用于设计、预览与打印测试。请勿用于伪造、变造真实车票或其他有价票证。
