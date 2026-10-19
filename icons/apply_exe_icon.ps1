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

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, string dwItem1, string dwItem2);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct SHFOLDERCUSTOMSETTINGS {
        public uint dwSize;
        public uint dwMask;
        public IntPtr pvid;
        public string pszWebViewTemplate;
        public uint cchWebViewTemplate;
        public string pszWebViewTemplateVersion;
        public string pszInfoTip;
        public uint cchInfoTip;
        public IntPtr pclsid;
        public uint dwFlags;
        public string pszIconFile;
        public uint cchIconFile;
        public int iIconIndex;
        public string pszLogo;
        public uint cchLogo;
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    public static extern int SHGetSetFolderCustomSettings(ref SHFOLDERCUSTOMSETTINGS pfcs, string pszPath, uint dwReadWrite);

    public static void SetFolderIcon(string folderPath, string icoPath, int iconIndex) {
        SHFOLDERCUSTOMSETTINGS fcs = new SHFOLDERCUSTOMSETTINGS();
        fcs.dwSize = (uint)Marshal.SizeOf(typeof(SHFOLDERCUSTOMSETTINGS));
        fcs.dwMask = 0x00000010; // FCSM_ICONFILE
        fcs.pszIconFile = icoPath;
        fcs.cchIconFile = 0;
        fcs.iIconIndex = iconIndex;
        SHGetSetFolderCustomSettings(ref fcs, folderPath, 0x00000002); // FCS_FORCEWRITE
        SHChangeNotify(0x00002000, 0x0005, folderPath, null); // SHCNE_UPDATEITEM | SHCNF_PATHW
    }

    public static bool ReplacePeIcon(string pePath, string icoPath) {
        byte[] icoBytes = File.ReadAllBytes(icoPath);
        if (icoBytes.Length < 200) return false;
        int count = BitConverter.ToUInt16(icoBytes, 4);
        IntPtr hUpdate = BeginUpdateResource(pePath, false);
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
                UpdateResource(hUpdate, (IntPtr)3, (IntPtr)iconResId, 0, imgData, dataSize);

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
            UpdateResource(hUpdate, (IntPtr)14, (IntPtr)1, 0, grpData, (uint)grpData.Length);
        }

        return EndUpdateResource(hUpdate, false);
    }

    public static void NotifyShellAll() {
        SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
    }
}
"@

function Update-BinaryIconLive([string]$targetFile, [string]$iconFile) {
    if (-not (Test-Path $targetFile)) { return }
    $oldFile = "$targetFile.old"
    Remove-Item -Path $oldFile -Force -ErrorAction SilentlyContinue
    if (-not [IconResUpdater]::ReplacePeIcon($targetFile, $iconFile)) {
        try {
            Move-Item -Path $targetFile -Destination $oldFile -Force -ErrorAction Stop
            Copy-Item -Path $oldFile -Destination $targetFile -Force -ErrorAction Stop
            [IconResUpdater]::ReplacePeIcon($targetFile, $iconFile) | Out-Null
            Remove-Item -Path $oldFile -Force -ErrorAction SilentlyContinue
        } catch { }
    }
    [IconResUpdater]::SHChangeNotify(0x00002000, 0x0005, $targetFile, $null)
}

# 1. Update mEXplorer.exe and lib\te64.dll embedded icon resources
Update-BinaryIconLive (Join-Path $baseDir "mEXplorer.exe") $icoPath
Update-BinaryIconLive (Join-Path $baseDir "lib\te64.dll") $icoPath

# 2. Update Desktop Shortcut (mEXplorer.lnk)
try {
    $wsh = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath("Desktop")
    $lnkPath = Join-Path $desktop "mEXplorer.lnk"
    Remove-Item -Path $lnkPath -Force -ErrorAction SilentlyContinue
    $sc = $wsh.CreateShortcut($lnkPath)
    $sc.TargetPath = Join-Path $baseDir "mEXplorer.exe"
    $sc.WorkingDirectory = $baseDir
    $sc.IconLocation = "$icoPath,0"
    $sc.Description = "mEXplorer - Modern Dosya Yöneticisi"
    $sc.Save()
    [IconResUpdater]::SHChangeNotify(0x00002000, 0x0005, $lnkPath, $null)
} catch { }

# 3. Update Context Menu Icon in Registry
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

# 4. Handle Desktop & Windows Folder Icons
$desktopDir = [Environment]::GetFolderPath("Desktop")
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

    if (Test-Path $desktopDir) {
        Get-ChildItem -Path $desktopDir -Directory | ForEach-Object {
            [IconResUpdater]::SetFolderIcon($_.FullName, $icoPath, 0)
        }
    }
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
    if (Test-Path $desktopDir) {
        Get-ChildItem -Path $desktopDir -Directory | ForEach-Object {
            $iniPath = Join-Path $_.FullName "desktop.ini"
            if (Test-Path $iniPath -Force) {
                $content = Get-Content -Path $iniPath -Force -Raw -ErrorAction SilentlyContinue
                if ($content -match "icons\\icon\d\.ico") {
                    attrib -s -h $iniPath
                    Remove-Item -Path $iniPath -Force -ErrorAction SilentlyContinue
                    attrib -r $_.FullName
                    [IconResUpdater]::SHChangeNotify(0x00002000, 0x0005, $_.FullName, $null)
                }
            }
        }
    }
}

[IconResUpdater]::NotifyShellAll()
Start-Process "ie4uinit.exe" -ArgumentList "-show" -WindowStyle Hidden -ErrorAction SilentlyContinue
