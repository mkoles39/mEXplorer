Sync.TabColorPlus = {
	cc: [],
	Color: [],
	db: {}
};
const re = /^\/(.*)\/(.*)/;
try {
	const ado = api.CreateObject("ads");
	ado.CharSet = "utf-8";
	ado.Open();
	ado.LoadFromFile(BuildPath(te.Data.DataFolder, "config\\tabcolorplus.tsv"));
	while (!ado.EOS) {
		const ar = ado.ReadText(adReadLine).split("\t");
		if (ar[0] != "") {
			let cc = ar.shift();
			const res = re.exec(cc);
			if (res || /\*|\?/.test(cc)) {
				Sync.TabColorPlus.cc.push(res ? new RegExp(res[1], res[2]) : cc);
				Sync.TabColorPlus.Color.push(ar.join("\n"));
				continue;
			}
			const a2 = cc.toLowerCase().split(/;/);
			for (let i = 0; i < a2.length; ++i) {
				const n = a2[i].replace(/^\s+|\s+$/g, "");
				if (Sync.TabColorPlus.db[n]) {
					continue;
				}
				Sync.TabColorPlus.db[n] = ar.join("\n");
			}
		}
	}
	ado.Close();
} catch (e) { }

Sync.TabColorPlus.DarkMap = {
	"#dbeafe": "#172554\n#dbeafe",
	"#e0e7ff": "#1e1b4b\n#c7d2fe",
	"#fef3c7": "#451a03\n#fde68a",
	"#ede9fe": "#2e1065\n#ddd6fe",
	"#dcfce7": "#064e3b\n#a7f3d0",
	"#e0f2fe": "#0c4a6e\n#bae6fd",
	"#f1f5f9": "#1e293b\n#e2e8f0",
	"#ffedd5": "#431407\n#fed7aa"
};

Sync.TabColorPlus.Adapt = function (val) {
	if (val && GetNum(te.Data.Conf_DarkMode)) {
		const bg = String(val).split(/\s/)[0].toLowerCase();
		if (Sync.TabColorPlus.DarkMap[bg]) {
			return Sync.TabColorPlus.DarkMap[bg];
		}
	}
	return val;
};

AddEvent("GetTabColor", function (Ctrl) {
	const path = api.GetDisplayNameOf(Ctrl, SHGDN_FORPARSING);
	const path2 = api.GetDisplayNameOf(Ctrl, SHGDN_FORADDRESSBAR | SHGDN_FORPARSING);
	const r = Sync.TabColorPlus.db[path.toLowerCase()] || Sync.TabColorPlus.db[path2.toLowerCase()];
	if (r) {
		return Sync.TabColorPlus.Adapt(r);
	}
	for (let i = 0; i < Sync.TabColorPlus.cc.length; ++i) {
		const cc = Sync.TabColorPlus.cc[i];
		if (cc.test ? cc.test(path) || cc.test(path2) : api.PathMatchSpec(path, cc) || api.PathMatchSpec(path2, cc)) {
			return Sync.TabColorPlus.Adapt(Sync.TabColorPlus.Color[i]);
		}
	}
});
