#!/bin/zsh
# Double-click in Finder to launch the game from this folder.
cd -- "${0:A:h}" || exit 1
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
unset ELECTRON_RUN_AS_NODE
fail() {
  print -r -- "$1"
  read -r '?按回车关闭窗口…'
  exit 1
}
command -v node >/dev/null 2>&1 || fail '找不到 Node.js，请先安装 Node.js 22.12 或更新版本。'
command -v npm >/dev/null 2>&1 || fail '找不到 npm，请检查 Node.js 安装。'
if [[ ! -d node_modules/electron || ! -d node_modules/vite ]]; then
  print '正在安装游戏依赖，首次启动需要联网…'
  npm ci || fail '依赖安装失败，请检查网络后重试。'
fi
print '正在启动木昆竞技场。关闭此终端会停止游戏。'
npm start
result=$?
if (( result != 0 )); then
  fail '游戏未能启动，请查看上方错误信息。'
fi
