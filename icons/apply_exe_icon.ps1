param(
    [int]$IconIndex = 1,
    [switch]$ApplyFolderIcons,
    [switch]$RestoreFolderIcons
)

$baseDir = Split-Path -Parent $PSScriptRoot
if (-not $baseDir -or -not (Test-Path (Join-Path $baseDir "mEXplorer.exe"))) {
    $baseDir = "C:\Users\murat.kales\Documents\te260202"
}
$icoPath = Join-Path $baseDir "icons\icon$IconIndex.ico"
if (-not (Test-Path $icoPath)) {
    $icoPath = Join-Path $baseDir "icons\icon1.ico"
}

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class IconResUpdater {
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern IntPtr BeginUpdateResource(string pFileName, bool bDeleteExistingResources);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool UpdateResource(IntPtr hUpdate, IntPtr lpType, IntPtr lpName, ushort wLanguage, byte[] lpData, uint cbData);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool EndUpdateResource(IntPtr hUpdate, bool fDiscard);

    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    public static bool ReplaceExeIcon(string exePath, string icoPath, ushort langId) {
        byte[] icoBytes = File.ReadAllBytes(icoPath);
        int count = BitConverter.ToUInt16(icoBytes, 4);
        IntPtr hUpdate = BeginUpdateResource(exePath, false);
        if (hUpdate == IntPtr.Zero) return false;

        using (MemoryStream grpMs = new MemoryStream())
        using (BinaryWriter grpBw = new BinaryWriter(grpMs)) {
            grpBw.Write((ushort)0);
            grpBw.Write((ushort)1);
            grpBw.Write((ushort)count);

            for (int i = 0; i < count; i++) {
                int entryOff = 6 + (i * 16);
                byte w = icoBytes[entryOff + 0];
                byte h = icoBytes[entryOff + 1];
                byte colors = icoBytes[entryOff + 2];
                byte res = icoBytes[entryOff + 3];
                ushort planes = BitConverter.ToUInt16(icoBytes, entryOff + 4);
                ushort bpp = BitConverter.ToUInt16(icoBytes, entryOff + 6);
                uint dataSize = BitConverter.ToUInt32(icoBytes, entryOff + 8);
                uint dataOff = BitConverter.ToUInt32(icoBytes, entryOff + 12);

                byte[] imgData = new byte[dataSize];
                Buffer.BlockCopy(icoBytes, (int)dataOff, imgData, 0, (int)dataSize);

                ushort iconResId = (ushort)(i + 1);
                UpdateResource(hUpdate, (IntPtr)3, (IntPtr)iconResId, langId, imgData, dataSize);

                grpBw.Write(w);
                grpBw.Write(h);
                grpBw.Write(colors);
                grpBw.Write(res);
                grpBw.Write(planes);
                grpBw.Write(bpp);
                grpBw.Write(dataSize);
                grpBw.Write(iconResId);
            }

            grpBw.Flush();
            byte[] grpData = grpMs.ToArray();
            // Update RT_GROUP_ICON (14) at ID 1 and ID 128
            UpdateResource(hUpdate, (IntPtr)14, (IntPtr)1, langId, grpData, (uint)grpData.Length);
        }

        return EndUpdateResource(hUpdate, false);
    }

    public static void NotifyShell() {
        SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
    }
}
"@

# 1. Update Desktop Shortcut (mEXplorer.lnk)
try {
    $wsh = New-Object -ComObject WScript.Shell
    $desktop = $wsh.SpecialFolders("Desktop")
    $lnkPath = Join-Path $desktop "mEXplorer.lnk"
    $sc = $wsh.CreateShortcut($lnkPath)
    $sc.TargetPath = Join-Path $baseDir "mEXplorer.exe"
    $sc.WorkingDirectory = $baseDir
    $sc.IconLocation = "$icoPath,0"
    $sc.Description = "mEXplorer - Modern Dosya Yöneticisi"
    $sc.Save()
} catch { }

# 2. Update Context Menu Icon in Registry
foreach ($t in @("Directory", "Drive")) {
    $k = "HKCU:\Software\Classes\$t\shell\tablacus"
    if (Test-Path $k) {
        Set-ItemProperty -Path $k -Name "Icon" -Value "$icoPath,0"
    }
}
$bgk = "HKCU:\Software\Classes\Directory\Background\shell\tablacus"
if (Test-Path $bgk) {
    Set-ItemProperty -Path $bgk -Name "Icon" -Value "$icoPath,0"
}

# 3. Try updating mEXplorer.exe resource directly (if not locked; otherwise copy -> update -> swap if possible)
$exePath = Join-Path $baseDir "mEXplorer.exe"
try {
    [IconResUpdater]::ReplaceExeIcon($exePath, $icoPath, 0) | Out-Null
    [IconResUpdater]::ReplaceExeIcon($exePath, $icoPath, 1033) | Out-Null
} catch { }

# 4. Handle Windows / Desktop Folder Icons if requested
if ($ApplyFolderIcons) {
    foreach ($cls in @("Directory", "Folder")) {
        $diKey = "HKCU:\Software\Classes\$cls\DefaultIcon"
        if (-not (Test-Path $diKey)) {
            New-Item -Path $diKey -Force | Out-Null
        }
        Set-ItemProperty -Path $diKey -Name "(default)" -Value "$icoPath,0"
    }
    $siKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons"
    if (-not (Test-Path $siKey)) {
        New-Item -Path $siKey -Force | Out-Null
    }
    Set-ItemProperty -Path $siKey -Name "3" -Value "$icoPath,0"
    Set-ItemProperty -Path $siKey -Name "4" -Value "$icoPath,0"
} elseif ($RestoreFolderIcons) {
    foreach ($cls in @("Directory", "Folder")) {
        $diKey = "HKCU:\Software\Classes\$cls\DefaultIcon"
        if (Test-Path $diKey) {
            Remove-Item -Path $diKey -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    $siKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons"
    if (Test-Path $siKey) {
        Remove-ItemProperty -Path $siKey -Name "3" -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path $siKey -Name "4" -ErrorAction SilentlyContinue
    }
}

[IconResUpdater]::NotifyShell()
Start-Process "ie4uinit.exe" -ArgumentList "-show" -WindowStyle Hidden -ErrorAction SilentlyContinue
