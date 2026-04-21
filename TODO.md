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

### 3. Sport/Esports AI edge integration
`SportEvent` и `EsportsMatch` не имеют `ai.edge` / `ai.fairProb` полей.
`SportMatchCard` и `EsportsMatchCard` scaffolded под PRX, но `getPrxEdge`
возвращает `null` до тех пор пока backend не добавит AI signal.

- Для Sport: подумать о mapping `SportOdds.ai_value.value_rating → edge`
  если семантика сойдётся с pp-convention (сейчас `value_rating` в другой
  шкале).
- Для Esports: AI signal отсутствует полностью, требуется отдельная модель.

### 4. Live win-probability time-series для sparkline
Компоненты SportMatchCard / EsportsMatchCard предусматривают слот для
sparkline в live-режиме (тренд вероятности команды A за последние ~15 минут),
но в list-response сейчас этого массива нет:
- `SportEvent.raw_data` не содержит timeseries;
- `EsportsMatch` тоже;
- `EsportsDotaLive.winRates` есть, но только в detail-ответе.

**Задача для backend:** прокинуть короткую win-probability историю (например,
последние N точек) в list-эндпоинты `/sport` и `/cybersport`, чтобы sparkline
рендерился из list-данных без дополнительного запроса.

### 5. Tournament importance / tier derivation для esports
EsportsMatchCard предусматривает показ importance stars (1–5), но у нас
нет ни `tournament.tier`, ни `prizePool` в list-ответе (`EsportsMatch.tournament`
— только `string`).

**Задача:** либо подключить GRID tier metadata, либо завести manual mapping
major турниров (LAN/Tier 1/2/3) до появления данных. До тех пор stars-блок
в карточках не рендерится, чтобы не показывать фейковые сигналы.
