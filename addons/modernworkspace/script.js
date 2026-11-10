const Addon_Id = "modernworkspace";
const item = GetAddonElement(Addon_Id);

if (window.Addon == 1) {
	const T = {};
	for (const k of [
		"Dual Pane",
		"Single pane / side-by-side dual pane (F6)",
		"Preview",
		"Show / hide the preview pane",
		"Dated Folder",
		"Create a new folder named with today's date (YYYY-MM-DD)",
		"Dark",
		"Light",
		"Switch between light and dark theme",
		"Ready",
		"items",
		"selected",
		"free",
		"Name",
		"Type",
		"Size",
		"Date modified",
		"Full path",
		"Folder",
		"File",
		"%s items copied to the clipboard as a table (ready to paste into Excel)",
		"Folder created: %s",
		"Application icon changed to #%s",
		"Desktop and Windows folder icons updated",
		"Windows folder icons restored to default"
	]) {
		T[k] = await GetText(k);
	}

	Addons.ModernWorkspace = {
		isDark: false,
		savedRightWidth: 230,
		tidStatus: null,

		Init: async function () {
			const darkConf = await te.Data.Conf_DarkMode;
			Addons.ModernWorkspace.isDark = Boolean(GetNum(darkConf));
			const rw = await te.Data.Conf_RightBarWidth;
			if (rw > 0) {
				Addons.ModernWorkspace.savedRightWidth = rw;
			}
			await Addons.ModernWorkspace.ApplyTheme(Addons.ModernWorkspace.isDark, true);
			await Addons.ModernWorkspace.UpdateButtons();
			setTimeout(Addons.ModernWorkspace.UpdateStatus, 150);
		},

		ToggleTheme: async function () {
			Addons.ModernWorkspace.isDark = !Addons.ModernWorkspace.isDark;
			te.Data.Conf_DarkMode = Addons.ModernWorkspace.isDark ? 1 : 0;
			await Addons.ModernWorkspace.ApplyTheme(Addons.ModernWorkspace.isDark, false);
			await Addons.ModernWorkspace.UpdateButtons();
		},

		ApplyTheme: async function (bDark, bInit) {
			if (bDark) {
				document.body.classList.add("dark-theme");
			} else {
				document.body.classList.remove("dark-theme");
			}
			try {
				if (await $.Sync && await $.Sync.ModernWorkspace) {
					await $.Sync.ModernWorkspace.SetTheme(bDark);
				}
				await InitBG(bDark ? "#0f172a" : "#f8fafc", true);
				if (Addons.TabPlus && Addons.TabPlus.Arrange) {
					const cTC = await te.Ctrls(CTRL_TC, true);
					const nTC = await GetLength(cTC);
					for (let i = 0; i < nTC; ++i) {
						const tc = await cTC[i];
						await Addons.TabPlus.Arrange(await tc.Id, true);
					}
				}
			} catch (e) { }
		},

		IsDualPane: async function () {
			const cTC = await te.Ctrls(CTRL_TC, true);
			return (await GetLength(cTC)) > 1;
		},

		ToggleDualPane: async function () {
			const cTC = await te.Ctrls(CTRL_TC);
			const nAll = await GetLength(cTC);
			const cVis = await te.Ctrls(CTRL_TC, true);
			const nVis = await GetLength(cVis);

			if (nVis > 1) {
				// Switch to Single Pane without losing tabs
				const TC0 = await cVis[0];
				for (let i = 1; i < nVis; ++i) {
					const TCi = await cVis[i];
					TCi.Visible = false;
				}
				TC0.Left = 0;
				TC0.Top = 0;
				TC0.Width = "100%";
				TC0.Height = "100%";
			} else if (nVis == 1) {
				// Switch to Side-by-Side Dual Pane (50% / 50%)
				const TC0 = await cVis[0];
				TC0.Left = 0;
				TC0.Top = 0;
				TC0.Width = "50%";
				TC0.Height = "100%";

				let TC1 = null;
				for (let i = 0; i < nAll; ++i) {
					const cand = await cTC[i];
					if ((await cand.Id) != (await TC0.Id)) {
						TC1 = cand;
						break;
					}
				}
				if (TC1) {
					TC1.Left = "50%";
					TC1.Top = 0;
					TC1.Width = "50%";
					TC1.Height = "100%";
					TC1.Visible = true;
					const cnt = await TC1.Count;
					if (!cnt) {
						const curFV = await TC0.Selected;
						const curPath = curFV ? await curFV.FolderItem : "C:\\";
						await TC1.Selected.Navigate2(curPath, SBSP_NEWBROWSER, await te.Data.View_Type, await te.Data.View_ViewMode, await te.Data.View_fFlags, await te.Data.View_Options, await te.Data.View_ViewFlags, await te.Data.View_IconSize, await te.Data.Tree_Align, await te.Data.Tree_Width, await te.Data.Tree_Style, await te.Data.Tree_EnumFlags, await te.Data.Tree_RootStyle, await te.Data.Tree_Root);
					}
				} else {
					const style = await TC0.Style;
					const align = await TC0.Align;
					const tabW = await TC0.TabWidth;
					const tabH = await TC0.TabHeight;
					TC1 = await te.CreateCtrl(CTRL_TC, "50%", 0, "50%", "100%", style, align, tabW, tabH);
					const curFV = await TC0.Selected;
					const curPath = curFV ? await curFV.FolderItem : "C:\\";
					await TC1.Selected.Navigate2(curPath, SBSP_NEWBROWSER, await te.Data.View_Type, await te.Data.View_ViewMode, await te.Data.View_fFlags, await te.Data.View_Options, await te.Data.View_ViewFlags, await te.Data.View_IconSize, await te.Data.Tree_Align, await te.Data.Tree_Width, await te.Data.Tree_Style, await te.Data.Tree_EnumFlags, await te.Data.Tree_RootStyle, await te.Data.Tree_Root);
				}
			}
			await Resize();
			await Addons.ModernWorkspace.UpdateButtons();
			return S_OK;
		},

		TogglePreview: async function () {
			const curW = GetNum(await te.Data.Conf_RightBarWidth);
			const prevBar = document.getElementById("PreviewBar");
			if (curW > 0 && prevBar && !/^none$/i.test(prevBar.style.display)) {
				Addons.ModernWorkspace.savedRightWidth = curW;
				te.Data.Conf_RightBarWidth = 0;
				prevBar.style.display = "none";
			} else {
				const newW = Addons.ModernWorkspace.savedRightWidth > 80 ? Addons.ModernWorkspace.savedRightWidth : 230;
				te.Data.Conf_RightBarWidth = newW;
				if (prevBar) {
					prevBar.style.display = "";
				}
				if (Addons.Preview && Addons.Preview.Arrange) {
					const FV = await GetFolderView();
					if (FV && await FV.ItemCount(SVGIO_SELECTION) > 0) {
						Addons.Preview.Arrange(await FV.SelectedItems().Item(0), FV);
					}
				}
			}
			await Resize();
			await Addons.ModernWorkspace.UpdateButtons();
		},

		CopyAsTable: async function () {
			const FV = await GetFolderView();
			if (!FV) {
				return;
			}
			let Items = await FV.SelectedItems();
			let nCount = Items ? await Items.Count : 0;
			if (!nCount) {
				Items = await FV.Items();
				nCount = Items ? await Items.Count : 0;
			}
			if (!nCount) {
				return;
			}
			const rows = [[T["Name"], T["Type"], T["Size"], T["Date modified"], T["Full path"]].join("\t")];
			for (let i = 0; i < nCount; ++i) {
				const item = await Items.Item(i);
				if (!item) {
					continue;
				}
				const name = await item.Name || "";
				const isFolder = await IsFolderEx(item);
				const typeStr = isFolder ? T["Folder"] : (await api.PSFormatForDisplay("Type", await item.ExtendedProperty("Type"), PDFF_DEFAULT) || T["File"]);
				let sizeStr = "";
				if (!isFolder) {
					const sz = await item.ExtendedProperty("Size");
					sizeStr = sz != null ? await api.StrFormatByteSize(sz) : "";
				}
				const dateStr = await api.PSFormatForDisplay("Write", await item.ExtendedProperty("Write"), PDFF_DEFAULT) || "";
				const fullPath = await api.GetDisplayNameOf(item, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING) || "";
				rows.push([name, typeStr, sizeStr, dateStr, fullPath].join("\t"));
			}
			await api.SetClipboardData(rows.join("\r\n"));
			Addons.ModernWorkspace.FlashMessage("📋 " + T["%s items copied to the clipboard as a table (ready to paste into Excel)"].replace("%s", nCount));
		},

		CreateDatedFolder: async function () {
			const FV = await GetFolderView();
			if (!FV) {
				return;
			}
			const folderItem = await FV.FolderItem;
			const basePath = await api.GetDisplayNameOf(folderItem, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
			if (!basePath || !await api.PathIsDirectory(basePath)) {
				return;
			}
			const now = new Date();
			const yyyy = now.getFullYear();
			const mm = String(now.getMonth() + 1).padStart(2, "0");
			const dd = String(now.getDate()).padStart(2, "0");
			const baseName = yyyy + "-" + mm + "-" + dd;
			let targetName = baseName;
			let targetPath = BuildPath(basePath, targetName);
			let suffix = 2;
			while (await api.PathFileExists(targetPath)) {
				targetName = baseName + "_" + suffix;
				targetPath = BuildPath(basePath, targetName);
				suffix++;
			}
			if (await CreateFolder2(targetPath)) {
				setTimeout(async function () {
					await FV.Refresh();
					setTimeout(async function () {
						await SelectItem(FV, targetPath, SVSI_SELECT | SVSI_FOCUSED | SVSI_ENSUREVISIBLE | SVSI_DESELECTOTHERS, 99);
					}, 250);
				}, 100);
				Addons.ModernWorkspace.FlashMessage("📅 " + T["Folder created: %s"].replace("%s", targetName));
			}
		},

		OpenTerminal: async function () {
			const FV = await GetFolderView();
			if (!FV) {
				return;
			}
			const folderItem = await FV.FolderItem;
			const path = await api.GetDisplayNameOf(folderItem, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
			if (path) {
				const safePath = path.replace(/'/g, "''");
				wsh.Run('powershell.exe -NoExit -Command "Set-Location -LiteralPath \'' + safePath + '\'"', SW_SHOWNORMAL);
			}
		},

		FlashMessage: function (msg) {
			const el = document.getElementById("mw_status_left");
			if (el) {
				el.innerHTML = '<span style="color: #0284c7; font-weight: bold">' + EncodeSC(msg) + '</span>';
				setTimeout(Addons.ModernWorkspace.UpdateStatus, 3000);
			}
		},

		UpdateButtons: async function () {
			const btnDual = document.getElementById("mw_btn_dual");
			if (btnDual) {
				const isDual = await Addons.ModernWorkspace.IsDualPane();
				btnDual.className = "mw-btn" + (isDual ? " mw-btn-active" : "");
			}
			const btnPrev = document.getElementById("mw_btn_preview");
			if (btnPrev) {
				const rw = GetNum(await te.Data.Conf_RightBarWidth);
				const prevBar = document.getElementById("PreviewBar");
				const isPrevOn = rw > 0 && (!prevBar || !/^none$/i.test(prevBar.style.display));
				btnPrev.className = "mw-btn" + (isPrevOn ? " mw-btn-active" : "");
			}
			const btnTheme = document.getElementById("mw_btn_theme");
			if (btnTheme) {
				btnTheme.innerHTML = Addons.ModernWorkspace.isDark ? "☀️ " + T["Light"] : "🌙 " + T["Dark"];
				btnTheme.className = "mw-btn" + (Addons.ModernWorkspace.isDark ? " mw-btn-active" : "");
			}
		},

		UpdateStatus: async function () {
			const elLeft = document.getElementById("mw_status_left");
			const elRight = document.getElementById("mw_status_right");
			if (!elLeft || !elRight) {
				return;
			}
			try {
				if (!(await $.Sync && await $.Sync.ModernWorkspace)) {
					return;
				}
				// One round trip: counts, selected size and (cached) drive space are gathered on the host side.
				const json = await $.Sync.ModernWorkspace.GetStatus();
				const st = json ? JSON.parse(json) : null;
				if (!st) {
					return;
				}
				let leftHtml = "📦 <b>" + st.total + "</b> " + T["items"];
				if (st.sel > 0) {
					leftHtml += " &nbsp;•&nbsp; ✅ <b>" + st.sel + "</b> " + T["selected"] + "<b>" + EncodeSC(st.size ? " (" + st.size + ")" : "") + "</b>";
				}
				elLeft.innerHTML = leftHtml;

				const d = st.drv;
				if (d) {
					const barColor = d.pct > 90 ? "#ef4444" : (d.pct > 75 ? "#f59e0b" : "#0284c7");
					elRight.innerHTML = (d.net ? "🌐" : "💽") + " <span>" + EncodeSC(d.name) + "</span>: <b>" + EncodeSC(d.free) + " " + T["free"] + "</b> / " + EncodeSC(d.total) + " (" + d.pct + "%)" +
						'<span class="mw-progress"><span class="mw-progress-fill" style="width:' + d.pct + '%; background-color:' + barColor + '"></span></span>';
					return;
				}
				elRight.innerHTML = st.path ? "📍 " + EncodeSC(st.path) : "";
			} catch (e) { }
		},

		OpenIconMenu: async function () {
			if (await $.Sync && await $.Sync.ModernWorkspace) {
				const res = await $.Sync.ModernWorkspace.ShowIconMenu();
				if (res >= 1 && res <= 4) {
					Addons.ModernWorkspace.FlashMessage("🎨 " + T["Application icon changed to #%s"].replace("%s", res));
				} else if (res == 10) {
					Addons.ModernWorkspace.FlashMessage("📁 " + T["Desktop and Windows folder icons updated"]);
				} else if (res == 11) {
					Addons.ModernWorkspace.FlashMessage("📁 " + T["Windows folder icons restored to default"]);
				}
			}
		},

		ScheduleStatus: function () {
			if (Addons.ModernWorkspace.tidStatus) {
				clearTimeout(Addons.ModernWorkspace.tidStatus);
			}
			Addons.ModernWorkspace.tidStatus = setTimeout(Addons.ModernWorkspace.UpdateStatus, 120);
		}
	};

	AddEvent("Layout", async function () {
		const barHtml = [
			'<span class="mw-bar">',
			'<span id="mw_btn_dual" class="mw-btn" onclick="Addons.ModernWorkspace.ToggleDualPane()" title="' + T["Single pane / side-by-side dual pane (F6)"] + '">◫ ' + T["Dual Pane"] + '</span>',
			'<span id="mw_btn_preview" class="mw-btn" onclick="Addons.ModernWorkspace.TogglePreview()" title="' + T["Show / hide the preview pane"] + '">👁 ' + T["Preview"] + '</span>',
			'<span id="mw_btn_datefolder" class="mw-btn" onclick="Addons.ModernWorkspace.CreateDatedFolder()" title="' + EncodeSC(T["Create a new folder named with today's date (YYYY-MM-DD)"]) + '">📅 ' + T["Dated Folder"] + '</span>',
			'<span id="mw_btn_theme" class="mw-btn" onclick="Addons.ModernWorkspace.ToggleTheme()" title="' + T["Switch between light and dark theme"] + '">🌙 ' + T["Dark"] + '</span>',
			'</span>'
		].join("");
		await SetAddon(Addon_Id, "ToolBar2Right", barHtml);

		const statusHtml = '<div class="mw-statusbar"><div id="mw_status_left">' + T["Ready"] + '</div><div id="mw_status_right"></div></div>';
		await SetAddon(null, "BottomBar3Center", statusHtml);

		SetKeyExec("All", "$40", Addons.ModernWorkspace.ToggleDualPane, "Func", true);
		SetKeyExec("All", "Ctrl+Shift+C", Addons.ModernWorkspace.CopyAsTable, "Func", true);
	});

	AddEvent("Load", Addons.ModernWorkspace.Init);

	AddEvent("StatusText", function () {
		Addons.ModernWorkspace.ScheduleStatus();
	});

	AddEvent("ChangeView1", function () {
		Addons.ModernWorkspace.ScheduleStatus();
	});

	if (GetNum(await te.Data.Conf_DarkMode)) {
		document.body.classList.add("dark-theme");
	}
	await $.importScript("addons\\" + Addon_Id + "\\sync.js");
}
