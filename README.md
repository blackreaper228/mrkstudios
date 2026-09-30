# mrkstudios

Портфолио с интерактивным 3D-телевизором и каруселью из пяти фотографий. После входа через телевизор открывается белая страница с локальным временем, логотипом mrk, объёмным наклоном фотографий и курсором View. Боковые области, стрелки клавиатуры и свайпы переключают фотографии. Нажатие на фотографию открывает увеличенный просмотр.

## Локальный просмотр

Запустите из папки dist:

```sh
python -m http.server 4173
```

Откройте http://127.0.0.1:4173/ . Сборка и установка зависимостей не требуются.

## Файлы

- dist/index.html — разметка страницы и ссылка contact.
- dist/style.css — оформление, Inter и Instrument Serif.
- dist/app.js — 3D-телевизор и переход к портфолио.
- dist/carousel.js — карусель, тильт и курсор; dist/content.js — загрузка контента.
- docs — копия сайта для GitHub Pages (main /docs). После правок запускайте python scripts/sync-site.py: скрипт сохраняет контент клиента.

Сайт: https://blackreaper228.github.io/mrkstudios/

Фотографии — временные внешние изображения Picsum. Фотографии и заголовки редактируются через Pages CMS; источник — docs/content/portfolio.json, загрузки — docs/uploads. Инструкция подключения: [PAGES-CMS.md](PAGES-CMS.md). Массив в carousel.js служит только резервом при ошибке загрузки контента. Three.js загружается с jsDelivr, шрифты — с Google Fonts. Для contact пока указан mailto: без получателя; адрес клиента ещё не задан. Menu открывает пять галерей с фотографиями и видео, редактируемыми через Pages CMS. Логотип возвращает к телевизору. Атрибуция модели находится на credits/.

Модель: Old TV by visualdiscette, CC BY 4.0. Оригинальный GLB и сведения о лицензии находятся в assets; авторство и изменения при отображении указаны на странице credits/.


## Category photoshoots

Category covers now link to `session.html?category=events&work=...`. In Pages CMS each category item has an optional permanent `slug`, `description`, and `session` list of photographs or videos. Keep the slug unchanged once shared; without a slug the current item position is used. Existing records remain intact, and an empty session displays the cover. Category pages use four portrait columns, titles above covers, and a large top margin; mobile uses two columns.
