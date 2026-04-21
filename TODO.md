# TODO / Backlog

## Backend / data model

### 1. 1X2 markets return independent probabilities
`SportPrediction` отдаёт `home_pct`, `draw_pct`, `away_pct` как независимые целые
числа, их сумма не гарантированно равна 100 (наблюдаемо: 99 или 101).

Фронт сейчас компенсирует это через `normalizeOutcomeProbabilities`
(largest-remainder) в `src/lib/probabilities.ts`, применяется в
`SportEventPage`. Это обход бэкенд-проблемы, не фикс.

**Задача для backend team:** probability model на бэкенде должна отдавать
согласованные значения (сумма = 1.0 с точностью до округления), чтобы
фронтовая нормализация стала защитой, а не коррекцией.

### 2. Market.yesPrice dual-scale ambiguity
Поле `Market.yesPrice` в коде трактуется и как доля `0–1`, и как процент
`0–100` в зависимости от источника/места. Утилиты `normalizeBinary` и
`getMarketStatus` учитывают обе шкалы (`v > 1 ? v / 100 : v`), но это tech
debt — неявный контракт, легко сломать.

**Задача:** унифицировать на один формат. Предложение: всегда `0–1` на уровне
API / Market type, фронт форматирует в проценты для вывода. После миграции
убрать двойную проверку из утилит.
