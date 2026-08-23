; installer.nsh — 自定义 NSIS 安装/卸载脚本钩子
; electron-builder 会在安装流程中自动 include 此文件

!macro customHeader
  !system "echo '自定义 NSIS 安装脚本已加载'"
!macroend

; 安装完成后的自定义操作
!macro customInstall
  ; 确保数据目录存在（用户文档目录）
  CreateDirectory "$APPDATA\${APP_FILENAME}\data"
!macroend

; 卸载前自定义操作
!macro customUnInstall
  ; 清理应用数据（可选）：默认按钮为“否”，静默升级时也不会误删数据
  MessageBox MB_YESNO|MB_DEFBUTTON2 "是否同时删除应用数据（排课数据、配置文件等）？$\n$\n此操作不可恢复。" IDNO skipClean
    RMDir /r "$APPDATA\${APP_FILENAME}"
  skipClean:
!macroend
