' Wayfarer: run the local service without showing a console window.
' Used by the logon scheduled task; double-clicking it also works.
Option Explicit
Dim fso, sh, base
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = base
If Not fso.FolderExists(base & "\logs") Then
  fso.CreateFolder(base & "\logs")
End If
sh.Run "cmd /c start.cmd --no-open >> logs\boot.log 2>&1", 0, False
