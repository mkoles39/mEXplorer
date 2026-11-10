Sync.ModernWorkspace = {
	bDark: Boolean(GetNum(te.Data.Conf_DarkMode)),
	clrText: 0xf0e8e2,
	clrBk: 0x221712,
	clrLine: 0x475569,
	clrBtnFace: 0x2b1e15,
	themed: {},
	nThemed: 0,
	pass: null,
	rcPaint: null,
	drives: {},

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
			"1. Fluent Electric Blue 'm'",
			"2. Dark Obsidian & Gold (mX)",
			"3. Neon Cyber Gradient",
			"4. Minimalist Emerald Pro"
		];
		for (let i = 0; i < names.length; ++i) {
			const id = i + 1;
			api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING | (curIcon == id ? MF_CHECKED : 0), id, names[i]);
		}
		api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
		api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING | (isFolderCustom ? MF_CHECKED : 0), 10, GetText("Also apply to Desktop / Windows folder icons"));
		api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, 11, GetText("Restore default Windows folder icons"));

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

	// nMode: 0 = view shown again (tab switch), 1 = navigation finished, 2 = window just created, 3 = theme changed
	Arrange: function (Ctrl, nMode) {
		const FV = GetFolderView(Ctrl);
		if (FV) {
			const hwnd = FV.hwndList;
			if (hwnd) {
				Sync.ModernWorkspace.SetColor(FV, hwnd, nMode);
			}
		}
	},

	ApplyThemeWindow: function (hwnd, themeName) {
		if (!hwnd) {
			return;
		}
		const pass = Sync.ModernWorkspace.pass;
		if (pass) {
			// Each window is themed only once per pass (parents and children overlap).
			if (pass[hwnd]) {
				return;
			}
			pass[hwnd] = 1;
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

	SetColor: function (FV, hwnd, nMode) {
		const bDark = Sync.ModernWorkspace.bDark;
		const themeExp = bDark ? "darkmode_explorer" : "explorer";
		const themeItems = bDark ? "darkmode_itemsview" : "itemsview";
		const hHeader = api.SendMessage(hwnd, LVM_GETHEADER, 0, 0);

		// Skip the (expensive) re-theming when this list window already has the current theme.
		// A new view is themed when it is created and once more when its navigation finishes
		// (child windows may appear late); switching back to an already themed tab costs nothing.
		if ("number" === typeof hwnd) {
			const key = (bDark ? "d" : "l") + hHeader;
			const cur = Sync.ModernWorkspace.themed[hwnd];
			if (nMode === 1 ? cur === key + "|n" : nMode !== 2 && nMode !== 3 && (cur === key + "|n" || cur === key + "|v")) {
				return;
			}
			if (++Sync.ModernWorkspace.nThemed > 2000) {
				Sync.ModernWorkspace.themed = {};
				Sync.ModernWorkspace.nThemed = 0;
			}
			Sync.ModernWorkspace.themed[hwnd] = key + (nMode === 2 ? "|v" : "|n");
		}
		Sync.ModernWorkspace.pass = {};
		try {
			Sync.ModernWorkspace.SetColor2(FV, hwnd, bDark, themeExp, themeItems, hHeader);
		} catch (e) { }
		Sync.ModernWorkspace.pass = null;
	},

	SetColor2: function (FV, hwnd, bDark, themeExp, themeItems, hHeader) {

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
			Sync.ModernWorkspace.Arrange(cFV[i], 3);
		}
	},

	// Everything the status bar needs, gathered in one call (the UI used to make hundreds of round trips).
	GetStatus: function () {
		const r = { total: 0, sel: 0, size: "", path: "" };
		try {
			const FV = GetFolderView();
			if (!FV) {
				return "";
			}
			r.total = FV.ItemCount(SVGIO_ALLVIEW);
			r.sel = FV.ItemCount(SVGIO_SELECTION);
			if (r.sel > 0 && r.sel <= 250) {
				const selItems = FV.SelectedItems();
				const t0 = new Date().getTime();
				let totalBytes = 0;
				let hasFile = false;
				let bPartial = false;
				for (let i = 0; i < r.sel; ++i) {
					const it = selItems.Item(i);
					if (it && !IsFolderEx(it)) {
						const sz = it.ExtendedProperty("Size");
						if (sz > 0) {
							totalBytes += Number(sz);
							hasFile = true;
						}
					}
					if (new Date().getTime() - t0 > 200) {
						bPartial = i < r.sel - 1;
						break;
					}
				}
				if (hasFile) {
					r.size = api.StrFormatByteSize(totalBytes) + (bPartial ? "+" : "");
				}
			}
			const folderItem = FV.FolderItem;
			r.path = folderItem ? api.GetDisplayNameOf(folderItem, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING) || "" : "";
			const drvName = GetDriveName(r.path);
			if (drvName) {
				const now = new Date().getTime();
				let d = Sync.ModernWorkspace.drives[drvName];
				// Free space is cached per drive: asking a network share on every selection change is slow.
				if (!d || now - d.t > (d.net ? 30000 : 5000)) {
					d = { t: now, net: /^\\\\/.test(drvName), ok: false };
					try {
						const drv = (("undefined" !== typeof fso && fso) || api.CreateObject("fso")).GetDrive(drvName);
						if (drv && drv.IsReady) {
							const freeBytes = Number(drv.FreeSpace);
							const totalBytes = Number(drv.TotalSize);
							if (totalBytes > 0) {
								d.ok = true;
								d.pct = Math.min(100, Math.max(0, Math.round(((totalBytes - freeBytes) / totalBytes) * 100)));
								d.free = api.StrFormatByteSize(freeBytes);
								d.totalStr = api.StrFormatByteSize(totalBytes);
							}
						}
					} catch (e) { }
					Sync.ModernWorkspace.drives[drvName] = d;
				}
				if (d.ok) {
					r.drv = { name: drvName, net: d.net, pct: d.pct, free: d.free, total: d.totalStr };
				}
			}
		} catch (e) { }
		return JSON.stringify(r);
	}
};

AddEvent("ViewCreated", function (Ctrl) {
	Sync.ModernWorkspace.Arrange(Ctrl, 2);
});
AddEvent("NavigateComplete", function (Ctrl) {
	Sync.ModernWorkspace.Arrange(Ctrl, 1);
});
AddEvent("ChangeView", function (Ctrl) {
	Sync.ModernWorkspace.Arrange(Ctrl, 0);
});

AddEvent("Create", function (Ctrl) {
	if (Ctrl.Type <= CTRL_EB) {
		Sync.ModernWorkspace.Arrange(Ctrl, 2);
		return;
	}
	if (Ctrl.Type == CTRL_TV) {
		Sync.ModernWorkspace.SetTV(Ctrl.hwndTree);
	}
});

AddEvent("Tools", function (Ctrl, hMenu, nPos) {
	api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, ++nPos, "📋 " + GetText("Copy as table for Excel") + "\tCtrl+Shift+C");
	ExtraMenuCommand[nPos] = function () {
		InvokeUI("Addons.ModernWorkspace.CopyAsTable");
		return S_OK;
	};
	api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, ++nPos, "⌨ " + GetText("Open PowerShell here"));
	ExtraMenuCommand[nPos] = function () {
		InvokeUI("Addons.ModernWorkspace.OpenTerminal");
		return S_OK;
	};
	api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, ++nPos, "🎨 " + GetText("Choose application and folder icon..."));
	ExtraMenuCommand[nPos] = function () {
		Sync.ModernWorkspace.ShowIconMenu();
		return S_OK;
	};
	return nPos;
});

AddEvent("Load", function () {
	Sync.ModernWorkspace.ApplyAppIcon(GetNum(te.Data.Conf_AppIcon) || 1, false);
	if (api.IsAppThemed() && WINVER > 0x603 && !Sync.ClassicStyle) {
		AddEvent("ItemPrePaint2", function (Ctrl, pid, nmcd, vcd, plRes) {
			if (Sync.ModernWorkspace.bDark) {
				const hList = Ctrl.hwndList;
				const uState = api.SendMessage(hList, LVM_GETITEMSTATE, nmcd.dwItemSpec, LVIS_SELECTED);
				if (uState & LVIS_SELECTED || nmcd.uItemState & CDIS_HOT) {
					const rc = Sync.ModernWorkspace.rcPaint || (Sync.ModernWorkspace.rcPaint = api.Memory("RECT"));
					rc.left = LVIR_SELECTBOUNDS;
					api.SendMessage(hList, LVM_GETITEMRECT, nmcd.dwItemSpec, rc);
					api.SetDCBrushColor(nmcd.hdc, (uState & LVIS_SELECTED) ? 0x5c3b1e : 0x3b2818);
					api.FillRect(nmcd.hdc, rc, api.GetStockObject(DC_BRUSH));
				}
			}
		});
	}
});

Sync.ModernWorkspace.Init();
