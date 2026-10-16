const Addon_Id = "modernworkspace";
const item = GetAddonElement(Addon_Id);

if (window.Addon == 1) {
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
			const rows = ["Ad\tTür\tBoyut\tDeğiştirme Tarihi\tTam Yol"];
			for (let i = 0; i < nCount; ++i) {
				const item = await Items.Item(i);
				if (!item) {
					continue;
				}
				const name = await item.Name || "";
				const isFolder = await IsFolderEx(item);
				const typeStr = isFolder ? "Klasör" : (await api.PSFormatForDisplay("Type", await item.ExtendedProperty("Type"), PDFF_DEFAULT) || "Dosya");
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
			Addons.ModernWorkspace.FlashMessage("📋 " + nCount + " öğe tablo olarak panoya kopyalandı (Excel'e yapıştırabilirsiniz)");
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
				Addons.ModernWorkspace.FlashMessage("📅 Klasör oluşturuldu: " + targetName);
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
				btnTheme.innerHTML = Addons.ModernWorkspace.isDark ? "☀️ Açık" : "🌙 Koyu";
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
				const FV = await GetFolderView();
				if (!FV) {
					return;
				}
				const totalCount = await FV.ItemCount(SVGIO_ALLVIEW);
				const selCount = await FV.ItemCount(SVGIO_SELECTION);
				let selSizeText = "";
				if (selCount > 0 && selCount <= 250) {
					const selItems = await FV.SelectedItems();
					let totalBytes = 0;
					let hasFile = false;
					for (let i = 0; i < selCount; ++i) {
						const it = await selItems.Item(i);
						if (it && !await IsFolderEx(it)) {
							const sz = await it.ExtendedProperty("Size");
							if (sz > 0) {
								totalBytes += Number(sz);
								hasFile = true;
							}
						}
					}
					if (hasFile) {
						selSizeText = " (" + (await api.StrFormatByteSize(totalBytes)) + ")";
					}
				}
				let leftHtml = "📦 <b>" + totalCount + "</b> öğe";
				if (selCount > 0) {
					leftHtml += " &nbsp;•&nbsp; ✅ <b>" + selCount + "</b> seçili<b>" + EncodeSC(selSizeText) + "</b>";
				}
				elLeft.innerHTML = leftHtml;

				// Drive / Network Share Free Space
				const folderItem = await FV.FolderItem;
				const path = folderItem ? await api.GetDisplayNameOf(folderItem, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING) : "";
				const drvName = GetDriveName(path);
				if (drvName) {
					try {
						const drv = await fso.GetDrive(drvName);
						if (drv && await drv.IsReady) {
							const freeBytes = Number(await drv.FreeSpace);
							const totalBytes = Number(await drv.TotalSize);
							if (totalBytes > 0) {
								const usedPct = Math.min(100, Math.max(0, Math.round(((totalBytes - freeBytes) / totalBytes) * 100)));
								const freeStr = await api.StrFormatByteSize(freeBytes);
								const totalStr = await api.StrFormatByteSize(totalBytes);
								const isNet = /^\\\\/.test(drvName);
								const icon = isNet ? "🌐" : "💽";
								const barColor = usedPct > 90 ? "#ef4444" : (usedPct > 75 ? "#f59e0b" : "#0284c7");
								elRight.innerHTML = icon + " <span>" + EncodeSC(drvName) + "</span>: <b>" + freeStr + " boş</b> / " + totalStr + " (" + usedPct + "%)" +
									'<span class="mw-progress"><span class="mw-progress-fill" style="width:' + usedPct + '%; background-color:' + barColor + '"></span></span>';
								return;
							}
						}
					} catch (e) { }
				}
				elRight.innerHTML = path ? "📍 " + EncodeSC(path) : "";
			} catch (e) { }
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
			'<span id="mw_btn_dual" class="mw-btn" onclick="Addons.ModernWorkspace.ToggleDualPane()" title="Tek Panel / Yan Yana Çift Panel (F6)">◫ Çift Panel</span>',
			'<span id="mw_btn_preview" class="mw-btn" onclick="Addons.ModernWorkspace.TogglePreview()" title="Sağ Önizleme Panelini Aç / Kapat">👁 Önizleme</span>',
			'<span id="mw_btn_copytable" class="mw-btn" onclick="Addons.ModernWorkspace.CopyAsTable()" title="Seçili dosyaları Excel tablosu olarak panoya kopyala">📋 Tablo Kopyala</span>',
			'<span id="mw_btn_datefolder" class="mw-btn" onclick="Addons.ModernWorkspace.CreateDatedFolder()" title="Bugünün tarihiyle (YYYY-AA-GG) yeni klasör oluştur">📅 Tarihli Klasör</span>',
			'<span id="mw_btn_terminal" class="mw-btn" onclick="Addons.ModernWorkspace.OpenTerminal()" title="Bulunulan klasörde PowerShell aç">💻 Terminal</span>',
			'<span id="mw_btn_theme" class="mw-btn" onclick="Addons.ModernWorkspace.ToggleTheme()" title="Açık / Koyu Tema Değiştir">🌙 Koyu</span>',
			'</span>'
		].join("");
		await SetAddon(Addon_Id, "ToolBar2Right", barHtml);

		const statusHtml = '<div class="mw-statusbar"><div id="mw_status_left">Hazır</div><div id="mw_status_right"></div></div>';
		await SetAddon(null, "BottomBar3Center", statusHtml);

		SetKeyExec("All", "$40", Addons.ModernWorkspace.ToggleDualPane, "Func", true);
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
