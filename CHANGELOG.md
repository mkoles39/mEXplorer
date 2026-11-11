# Changelog

## [Unreleased]

### Fixed
- `script/consts.js`: 14 tane geçersiz hex sabiti (`Ox80000000`) düzeltildi (`0x80000000`)
- `script/consts.js`: Geçersiz değişken tanımlaması (`Ox80000000 = ...`) kaldırıldı (değişken ismi rakamla başlayamaz)
- `lang/tr.xml`: 4 tane Türkçe yazım hatası düzeltildi:
  - `mtorunu` → `motorunu`
  - `İçinde` → `Başlatma` (Init)
  - `Pozisyonn` → `Pozisyon`
  - `%s,` → `Hakkında %s` (&About %s)

### Added
- `.github/workflows/ci.yml`: GitHub Actions CI pipeline eklendi (proje yapısı ve hex sabit kontrolü)
- `BUILD.md`: Derleme ve çalıştırma rehberi eklendi
- `CHANGELOG.md`: Bu dosya eklendi
- `CONTRIBUTING.md`: Katkıda bulunma rehberi eklendi
- `SECURITY.md`: Güvenlik politikası eklendi
- `.github/ISSUE_TEMPLATE/bug_report.md`: Hata raporu şablonu eklendi

## [2026.11.10] — mEXplorer261110

### Features
- Modern Fluent UI & tam dark mode desteği
- Sekmeli ve çift paneli dosya yönetimi
- Win + E kısayolu entegrasyonu
- Hızlı önizleme ve anında filtreleme
- Otomatik sekme renklendirme (Tab Color Plus)
- Excel'e tablo kopyalama (Ctrl + Shift + C)
- Tarihli klasör oluşturma
- PowerShell entegrasyonu

### Based on
- [Tablacus Explorer](https://github.com/tablacus/TablacusExplorer) by Gaku (MIT License)