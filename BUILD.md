# mEXplorer — Build & Derleme Rehberi

## Genel Bakış

mEXplorer, Windows için taşınabilir, sekmeli bir dosya yöneticisidir. Proje **Tablacus Explorer** tabanlıdır ve önceki derlenmiş binary'leri (`mEXplorer.exe`, `TE32.exe`, `TE64.exe`, `lib/*.dll`) ile birlikte sunulur.

## Gereksinimler

- Windows 10 / Windows 11
- [Tablacus Explorer](https://tablacus.github.io/) kurulu (geliştirme için)
- Bir metin düzenleyici (VS Code, Notepad++ vb.)

## Derleme / Çalıştırmak

Proje **portable**dır — ayrı bir derleme adımı gerekmez:

```powershell
# Proje klasörüne girin
cd C:\path\to\mEXplorer

# Uygulamayı çalıştırın
.\mEXplorer.exe
```

Geliştirme yaparken:
- `script/` klasöründeki JavaScript dosyalarını düzenleyin
- `lang/` klasöründeki XML dosyalarını düzenleyin (diller)
- `config/` ve `init/` klasörlerindeki XML dosyalarını düzenleyin (varsayılan ayarlar)

## Geliştirme Notları

- Kod dosyaları **UTF-8** encoding ile kaydedilmelidir
- Satır sonları **CRLF** (Windows) olmalıdır (`.gitattributes` ile yapılandırılmış)
- `consts.js` içinde hex sabitleri mutlaka `0x` öneki ile yazılmalıdır (`Ox` hatalıdır)
- Eklentiler `addons/` klasöründe, her birinin kendi `config.xml`, `script.js` ve opsiyonel `options.html`/`options.js` dosyaları bulunur

## Güncelleme Mekanizması

Uygulama içinden `Help > Check for updates` ile güncellemeler kontrol edilir. Güncelleyici, GitHub releases'deki ilk `.zip` asset'ini indirir ve sürümü dosya adından okur:

```
mEXplorerYYMMDD.zip   (örn. mEXplorer261110.zip)
```

## Lisans

[MIT License](LICENSE) — Tablacus Explorer (Gaku) üzerinden türetilmiştir.