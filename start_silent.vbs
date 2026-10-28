Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c cd /d """ & currentDir & """ && node fb_bot_daemon.js", 0, False
Set WshShell = Nothing

