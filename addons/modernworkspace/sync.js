Sync.ModernWorkspace = {
	bDark: Boolean(GetNum(te.Data.Conf_DarkMode)),
	clrText: 0xf0e8e2,
	clrBk: 0x221712,
	clrLine: 0x475569,
	clrBtnFace: 0x2b1e15,

	Init: function () {
		Sync.ModernWorkspace.bDark = Boolean(GetNum(te.Data.Conf_DarkMode));
		if (Sync.ModernWorkspace.bDark) {
			Sync.ModernWorkspace.clrText = 0xf0e8e2;
			Sync.ModernWorkspace.clrBk = 0x221712;
			Sync.ModernWorkspace.clrLine = 0x475569;
			Sync.ModernWorkspace.clrBtnFace = 0x2b1e15;
			SetSysColor(COLOR_WINDOWTEXT, Sync.ModernWorkspace.clrText);
			SetSysColor(COLOR_WINDOW, Sync.ModernWorkspace.clrBk);
			SetSysColor(COLOR_BTNFACE, Sync.ModernWorkspace.clrBtnFace);
			te.Data.View_ViewFlags |= 8;
		} else {
			SetSysColor(COLOR_WINDOWTEXT, void 0);
			SetSysColor(COLOR_WINDOW, void 0);
			SetSysColor(COLOR_BTNFACE, void 0);
			Sync.ModernWorkspace.clrText = GetSysColor(COLOR_WINDOWTEXT);
			Sync.ModernWorkspace.clrBk = GetSysColor(COLOR_WINDOW);
			Sync.ModernWorkspace.clrLine = GetSysColor(COLOR_WINDOWTEXT);
			te.Data.View_ViewFlags &= ~8;
		}
		Sync.ModernWorkspace.ApplyAppIcon(GetNum(te.Data.Conf_AppIcon) || 1, false);
		Sync.ModernWorkspace.Refresh();
	},

	ApplyAppIcon: function (nIcon, bRunScript, bFolderIcons, bRestoreFolders) {
		nIcon = GetNum(nIcon) || 1;
		if (nIcon < 1 || nIcon > 4) {
			nIcon = 1;
		}
		te.Data.Conf_AppIcon = nIcon;
		const icoPath = BuildPath(te.Data.Installed, "icons\\icon" + nIcon + ".ico");
		if (api.PathFileExists(icoPath)) {
			try {
				const hBig = api.LoadImage(0, icoPath, IMAGE_ICON, 48, 48, LR_LOADFROMFILE);
				const hSmall = api.LoadImage(0, icoPath, IMAGE_ICON, 16, 16, LR_LOADFROMFILE);
				if (hBig) {
					api.SendMessage(te.hwnd, 0x0080, 1, hBig);
					try { api.SetClassLongPtr(te.hwnd, -14, hBig); } catch (e) { }
				}
				if (hSmall) {
					api.SendMessage(te.hwnd, 0x0080, 0, hSmall);
					try { api.SetClassLongPtr(te.hwnd, -34, hSmall); } catch (e) { }
				}
			} catch (e) { }
		}
		if (bRunScript) {
			const ps1 = BuildPath(te.Data.Installed, "icons\\apply_exe_icon.ps1");
			if (api.PathFileExists(ps1)) {
				let args = '-ExecutionPolicy Bypass -WindowStyle Hidden -File "' + ps1 + '" -IconIndex ' + nIcon;
				if (bFolderIcons) {
					args += " -ApplyFolderIcons";
				} else if (bRestoreFolders) {
					args += " -RestoreFolderIcons";
				}
				try {
					wsh.Run("powershell.exe " + args, 0, false);
				} catch (e) { }
			}
		}
	},

	ShowIconMenu: function () {
		const curIcon = GetNum(te.Data.Conf_AppIcon) || 1;
		let isFolderCustom = false;
		try {
			const defIcon = wsh.RegRead("HKCU\\Software\\Classes\\Directory\\DefaultIcon\\");
			isFolderCustom = /icon\d\.ico/i.test(defIcon);
		} catch (e) { }

		const hMenu = api.CreatePopupMenu();
		const names = [
			"1. Fluent Electric Blue 'm' (Varsayılan)",
			"2. Dark Obsidian & Gold (mX)",
			"3. Neon Cyber Gradient",
			"4. Minimalist Emerald Pro"
		];
		for (let i = 0; i < names.length; ++i) {
			const id = i + 1;
			api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING | (curIcon == id ? MF_CHECKED : 0), id, names[i]);
		}
		api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
		api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING | (isFolderCustom ? MF_CHECKED : 0), 10, "Masaüstü / Windows Klasör İkonlarına da Uygula");
		api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, 11, "Windows Klasör İkonlarını Varsayılana Döndür");

		const pt = api.Memory("POINT");
		api.GetCursorPos(pt);
		const nVerb = api.TrackPopupMenuEx(hMenu, TPM_LEFTALIGN | TPM_LEFTBUTTON | TPM_RIGHTBUTTON | TPM_RETURNCMD, pt.x, pt.y, te.hwnd, null, null);
		api.DestroyMenu(hMenu);

		if (nVerb >= 1 && nVerb <= 4) {
			Sync.ModernWorkspace.ApplyAppIcon(nVerb, true, isFolderCustom, false);
			return nVerb;
		} else if (nVerb == 10) {
			Sync.ModernWorkspace.ApplyAppIcon(curIcon, true, true, false);
			return 10;
		} else if (nVerb == 11) {
			Sync.ModernWorkspace.ApplyAppIcon(curIcon, true, false, true);
			return 11;
		}
		return 0;
	},

	SetTheme: function (bDark) {
		te.Data.Conf_DarkMode = bDark ? 1 : 0;
		Sync.ModernWorkspace.bDark = Boolean(bDark);
		Sync.ModernWorkspace.Init();
	},

	Arrange: function (Ctrl) {
		const FV = GetFolderView(Ctrl);
		if (FV) {
			const hwnd = FV.hwndList;
			if (hwnd) {
				Sync.ModernWorkspace.SetColor(FV, hwnd);
			}
		}
	},

	ApplyThemeWindow: function (hwnd, themeName) {
		if (!hwnd) {
			return;
		}
		try {
			api.SetWindowTheme(hwnd, themeName, null);
			api.SetWindowPos(hwnd, null, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
			api.RedrawWindow(hwnd, null, 0, RDW_INVALIDATE | RDW_FRAME | RDW_ALLCHILDREN);
		} catch (e) { }
	},

	ApplyThemeChildren: function (hwndParent, bDark) {
		if (!hwndParent) {
			return;
		}
		const themeExp = bDark ? "darkmode_explorer" : "explorer";
		const themeItems = bDark ? "darkmode_itemsview" : "itemsview";
		let hChild = 0;
		while (hChild = api.FindWindowEx(hwndParent, hChild, null, null)) {
			const cls = api.GetClassName(hChild);
			if (cls === WC_HEADER) {
				Sync.ModernWorkspace.ApplyThemeWindow(hChild, themeItems);
			} else {
				if (cls === WC_TREEVIEW) {
					api.SendMessage(hChild, TVM_SETTEXTCOLOR, 0, Sync.ModernWorkspace.clrText);
					api.SendMessage(hChild, TVM_SETBKCOLOR, 0, Sync.ModernWorkspace.clrBk);
					api.SendMessage(hChild, TVM_SETLINECOLOR, 0, Sync.ModernWorkspace.clrLine);
				}
				Sync.ModernWorkspace.ApplyThemeWindow(hChild, themeExp);
			}
			Sync.ModernWorkspace.ApplyThemeChildren(hChild, bDark);
		}
	},

	SetColor: function (FV, hwnd) {
		const bDark = Sync.ModernWorkspace.bDark;
		const themeExp = bDark ? "darkmode_explorer" : "explorer";
		const themeItems = bDark ? "darkmode_itemsview" : "itemsview";

		if (bDark) {
			FV.ViewFlags |= 8;
		} else {
			FV.ViewFlags &= ~8;
		}

		api.SendMessage(hwnd, LVM_SETTEXTCOLOR, 0, Sync.ModernWorkspace.clrText);
		api.SendMessage(hwnd, LVM_SETBKCOLOR, 0, Sync.ModernWorkspace.clrBk);
		api.SendMessage(hwnd, LVM_SETTEXTBKCOLOR, 0, Sync.ModernWorkspace.clrBk);

		api.SetWindowTheme(hwnd, themeExp, null);
		if (Sync.ModernWorkspace.lastTitleDark !== bDark) {
			Sync.ModernWorkspace.lastTitleDark = bDark;
			api.SendMessage(te.hwnd, 0x001A, 0, 0);
		}
		Sync.ModernWorkspace.ApplyThemeWindow(hwnd, themeExp);
		if (FV.hwndView) {
			Sync.ModernWorkspace.ApplyThemeWindow(FV.hwndView, themeExp);
			Sync.ModernWorkspace.ApplyThemeChildren(FV.hwndView, bDark);
		}
		if (FV.hwnd) {
			Sync.ModernWorkspace.ApplyThemeWindow(FV.hwnd, themeExp);
			Sync.ModernWorkspace.ApplyThemeChildren(FV.hwnd, bDark);
		}
		const hHeader = api.SendMessage(hwnd, LVM_GETHEADER, 0, 0);
		if (hHeader) {
			Sync.ModernWorkspace.ApplyThemeWindow(hHeader, themeItems);
		}

		if (FV.TreeView) {
			Sync.ModernWorkspace.SetTV(FV.TreeView.hwndTree);
			if (FV.TreeView.hwnd) {
				Sync.ModernWorkspace.ApplyThemeWindow(FV.TreeView.hwnd, themeExp);
				Sync.ModernWorkspace.ApplyThemeChildren(FV.TreeView.hwnd, bDark);
			}
		}
		if (FV.Type == CTRL_EB) {
			Sync.ModernWorkspace.SetTV(FindChildByClass(FV.hwnd, WC_TREEVIEW));
		}
	},

	SetTV: function (hwnd) {
		if (hwnd) {
			const bDark = Sync.ModernWorkspace.bDark;
			const themeExp = bDark ? "darkmode_explorer" : "explorer";
			api.SendMessage(hwnd, TVM_SETTEXTCOLOR, 0, Sync.ModernWorkspace.clrText);
			api.SendMessage(hwnd, TVM_SETBKCOLOR, 0, Sync.ModernWorkspace.clrBk);
			api.SendMessage(hwnd, TVM_SETLINECOLOR, 0, Sync.ModernWorkspace.clrLine);
			Sync.ModernWorkspace.ApplyThemeWindow(hwnd, themeExp);
			Sync.ModernWorkspace.ApplyThemeChildren(hwnd, bDark);
			const hParent = api.GetParent(hwnd);
			if (hParent && hParent != te.hwnd) {
				Sync.ModernWorkspace.ApplyThemeWindow(hParent, themeExp);
			}
		}
	},

	Refresh: function () {
		const cFV = te.Ctrls(CTRL_FV);
		for (let i in cFV) {
			Sync.ModernWorkspace.Arrange(cFV[i]);
		}
	}
};

AddEvent("ViewCreated", Sync.ModernWorkspace.Arrange);
AddEvent("NavigateComplete", Sync.ModernWorkspace.Arrange);
AddEvent("ChangeView", Sync.ModernWorkspace.Arrange);

AddEvent("Create", function (Ctrl) {
	if (Ctrl.Type <= CTRL_EB) {
		Sync.ModernWorkspace.Arrange(Ctrl);
		return;
	}
	if (Ctrl.Type == CTRL_TV) {
		Sync.ModernWorkspace.SetTV(Ctrl.hwndTree);
	}
});

if (api.IsAppThemed() && WINVER > 0x603) {
	AddEvent("Load", function () {
		if (!Sync.ClassicStyle) {
			AddEvent("ItemPrePaint2", function (Ctrl, pid, nmcd, vcd, plRes) {
				if (Sync.ModernWorkspace.bDark) {
					const uState = api.SendMessage(Ctrl.hwndList, LVM_GETITEMSTATE, nmcd.dwItemSpec, LVIS_SELECTED);
					if (uState & LVIS_SELECTED || nmcd.uItemState & CDIS_HOT) {
						const rc = api.Memory("RECT");
						rc.left = LVIR_SELECTBOUNDS;
						api.SendMessage(Ctrl.hwndList, LVM_GETITEMRECT, nmcd.dwItemSpec, rc);
						api.SetDCBrushColor(nmcd.hdc, (uState & LVIS_SELECTED) ? 0x5c3b1e : 0x3b2818);
						api.FillRect(nmcd.hdc, rc, api.GetStockObject(DC_BRUSH));
					}
				}
			});
		}
	});
}

Sync.ModernWorkspace.Init();
