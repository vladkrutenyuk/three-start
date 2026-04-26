# Docs Structure — раскадровки разделов

Черновик: несколько вариантов структуры публичной документации. Каждый вариант отличается логикой группировки — читатель приходит к одному и тому же знанию разным путём. Содержание страниц пока не пишу, только заголовки + 1-2 строки что там будет. Цель: выбрать или скомбинировать вариант.

Общие фиксированные разделы везде (у всех вариантов они есть):
- **Overview** — мотивация, идея, кому нужно, позиционирование vs R3F/vanilla
- **Installation** — установка, peer-зависимости (three/webgpu), минимальный setup
- **Quick Start** — hello cube + первый компонент за 2 минуты

Дальше — варианты того, что идёт после Quick Start.

---

## Вариант A — Классический (как у Tanstack / Next / Astro)

**Логика**: онбординг → концепции → гайды → референс → примеры. Читатель идёт сверху вниз, каждый следующий уровень предполагает предыдущий. Привычная структура — знакома любому, кто читал современную доку.

```
Getting Started
├─ Overview
├─ Installation
└─ Quick Start

Core Concepts
├─ The Context              — что такое ThreeContext, render loop, события, таймер
├─ Components               — Object3DBehaviour, вешание на объект, доступ к ctx
├─ Modules                  — ContextModule, глобальный функционал, регистрация
├─ Lifecycle                — сводка всех onXxx у компонентов и модулей, когда что
└─ Active vs Enabled        — setActive(obj) vs component.enable/disable, отличие и когда какое

Guides (by task)
├─ Bootstrapping a Project
├─ Writing Behaviours
├─ Building Global Systems (Modules)
├─ Managing Active State    — отключать подсцены одной строкой
├─ Dynamic Spawning & Destroying
├─ Integrating Third-Party Libraries  — физика, tween, аудио
├─ Type-Safe Modules (Register)
├─ Custom Render Pipelines
└─ Working with DOM (HUD, overlays)

Advanced
├─ Lifecycle in Depth       — порядок фаз, один-раз vs много-раз
├─ Bootstrap Phases         — Phase 0/1/2, bootstrap-gate
├─ Subscription Order       — гарантии порядка слушателей (modules → components)
├─ Context Resolution       — как находится ctx, attachContext, childadded
├─ `visible` Patching       — почему setActive переопределяет getter
└─ Destroy Semantics        — что происходит при destroy объекта vs компонента

API Reference
├─ ThreeStart
├─ ThreeContext
├─ Object3DBehaviour
├─ ContextModule
├─ methods (addComponent, getComponent, setActive, destroy)
└─ Types (Register, event maps)

Examples
├─ Minimal Cube
├─ Snake Game
└─ Playground (live edit)

Philosophy
├─ Why Not ECS
├─ Why Vanilla + OOP (not R3F)
└─ Designed for AI-Assisted Coding
```

**Плюсы**: знакомая структура, удобно гуглить, API Reference чётко отделён.
**Минусы**: overview и philosophy разнесены — история «зачем это» теряется по дороге. Новичок не всегда доходит до Philosophy.

---

## Вариант B — Learning Journey (Start → Build → Scale → Master)

**Логика**: структура как путь обучения, не как оглавление. Разделы идут от «первое приложение» к «сложная интеграция» к «под капотом». Ориентир — человек, который пришёл учиться.

```
0. Introduction
├─ What is three-start     — одна страница-манифест, мотивация + позиционирование
└─ Who this is for          — vanilla+OOP люди, vibe-coders, команды

1. Getting Started
├─ Installation
├─ Your First Scene         — bootstrap, mount, start
└─ Your First Component     — Spin на кубе

2. Building Blocks
├─ The Context              — глобальный runtime
├─ Components               — поведения на объектах
├─ Modules                  — глобальные системы
└─ Lifecycle at a Glance    — визуальная карта всех onXxx

3. Building Real Things (пошаговые мини-кейсы, каждый — одна страница)
├─ Player Movement          — input module + controller behaviour
├─ Camera That Follows      — CameraFollow на camera object
├─ Spawning and Destroying  — addComponent на новые объекты, self-destruct
├─ Turning Things On/Off    — setActive каскад, паузы, меню
├─ Sharing State (Game Module)  — единый источник правды + события
└─ HUD / DOM Overlay        — подписка на события модуля

4. Integration Patterns
├─ Adding Physics           — Rapier/Cannon как ContextModule + Rigidbody behaviour
├─ Asset Loading            — Loader-модуль, preloading
├─ Audio
└─ Post-processing / Custom Render

5. TypeScript
├─ Register Pattern         — strong typing для modules
├─ Typed Behaviour Events   — EventEmitter generics
└─ Module Augmentation Tips

6. Going Deeper
├─ How Activation Works     — _activate/_deactivate, dormant state
├─ Bootstrap Phases         — Phase 0/1/2, gate
├─ Subscription Order       — гарантии
├─ Dynamic Hierarchy        — childadded, bootstrapNode
└─ `visible` Patching

7. Conventions & Best Practices
├─ Module vs Component      — когда какое
├─ File Organization
├─ Naming Behaviours
└─ AI Coding Tips           — как писать prompt'ы/rules для LLM под three-start

8. API Reference
└─ (all classes & functions)

9. Showcase
├─ Snake
└─ (others)
```

**Плюсы**: читается как книга, каждая следующая страница логично вытекает из предыдущей. Сильно снижает порог входа.
**Минусы**: если читатель пришёл за конкретным ответом — ему придётся искать через search/API, линейное оглавление ему мешает.

---

## Вариант C — Task-oriented ("How to...")

**Логика**: основная часть документации организована как ответы на вопросы «как сделать X». Хорошо работает для людей, которые уже знают зачем пришли.

```
Start Here
├─ Why three-start          — манифест
├─ Install
└─ Quick Start

Fundamentals (короткие концептуальные)
├─ What is a ThreeStart Instance
├─ What is a Behaviour
├─ What is a Module
├─ How Lifecycle Works
└─ Active vs Enabled

How To...
├─ ... bootstrap a Three.js scene
├─ ... write a behaviour
├─ ... write a module
├─ ... access a module from a behaviour
├─ ... share state between behaviours
├─ ... emit and listen to custom events
├─ ... pause or resume part of the scene
├─ ... spawn objects at runtime
├─ ... destroy things safely
├─ ... integrate a physics library
├─ ... load assets before scene starts
├─ ... make TypeScript smart about your modules
├─ ... handle window resize
├─ ... override the render function (custom pipeline)
├─ ... build a HUD / DOM overlay
└─ ... structure a larger project

Mental Model
├─ Scene Ownership          — единственный ctx на сцену, attachContext
├─ Context Resolution       — ext.resolveContext, кэш
├─ Subscription Order       — порядок слушателей
├─ Phase-Based Bootstrap    — Phase 0/1/2, bootstrap-gate
└─ Why Things Are Guaranteed — инварианты (один onStart, always-later subscribe и т.д.)

API Reference

Examples
```

**Плюсы**: максимально утилитарно — «мне надо сделать X» → одна страница с ответом. Хорошо для SEO и StackOverflow-траффика.
**Минусы**: манифест и «почему» уходят на задний план. Новичок, не знающий что он хочет, может растеряться. Раздел «Mental Model» легко пропустить.

---

## Вариант D — Entity-centric (структурировано вокруг классов)

**Логика**: один раздел = одна сущность. Подходит для людей, которые любят цельное покрытие по объекту.

```
Introduction
├─ Overview
├─ Install
└─ Quick Start

ThreeStart
├─ What it is
├─ Constructor options
├─ Registering modules
├─ start() and its phases
└─ Dynamic hierarchy handling (childadded)

ThreeContext
├─ What it is
├─ Renderer / Scene / Camera
├─ Render Loop
├─ Mount & Unmount
├─ Events (ThreeContextEvents)
├─ Timer (getDeltaTime / getTime)
├─ Custom render function
└─ Dispose

Object3DBehaviour
├─ Creating a behaviour
├─ Accessing the object and ctx
├─ Lifecycle methods (onAwake → onDestroy)
├─ enable / disable / setEnabled
├─ Automatic per-frame subscription
├─ Custom event types (typed EventEmitter)
└─ Self-destruct patterns

ContextModule
├─ Creating a module
├─ Lifecycle (subset)
├─ Cross-module access (this.modules)
├─ Module vs Behaviour: when to use what
└─ Emitting events for other parts of the app

Object3D as a Carrier
├─ Extension (внутренности)
├─ setActive(obj) — каскадная деактивация
├─ `visible` patching
└─ Component attachment rules

Register Pattern
├─ Why type-safe modules
├─ Augmenting ThreeStartRegister
└─ Typed addModule and this.modules

Internals
├─ Phase ordering
├─ Bootstrap gate
├─ Subscription order
├─ childadded flow
└─ Destroy semantics

Guides (use-case)
├─ Physics Integration
├─ Input Handling
├─ Asset Loading
├─ HUD & DOM
└─ Scene Transitions

Examples
```

**Плюсы**: очень чёткое покрытие каждой сущности, легко ориентироваться, «всё про Behaviour — здесь». Почти само-собой служит API-референсом.
**Минусы**: слабая наррация. Новичку трудно понять как сущности связаны — каждая страница рассказывает сама про себя. Мотивация библиотеки тонет.

---

## Вариант E — Hybrid с сильным манифестом (мой фаворит для старта)

**Логика**: сильное «почему» в начале (мотивация + сравнения + принципы), потом короткие концептуальные страницы, потом паттерны (задачи), потом под капот, потом референс. Выбирает лучшее из A и B: даёт нарратив на входе, но потом переходит в модульную структуру.

```
Introduction
├─ Why three-start          — манифест: боль → решение (опирается на idea.md)
├─ When to use it           — для кого и не для кого
└─ How it compares          — vanilla Three.js / R3F / game engines, честное сравнение

Getting Started
├─ Installation
├─ Quick Start              — 15-строчный hello
└─ Your First Component     — добавляем Spin, объясняем что произошло

Core Concepts (короткие, плотные, много перекрёстных ссылок)
├─ Context                  — runtime сцены
├─ Behaviours               — компоненты на объектах
├─ Modules                  — глобальные системы
├─ Lifecycle                — единая карта событий для обоих
└─ Activation System        — setActive vs enable/disable, каскад

Patterns (рецепты — по одной странице на паттерн)
├─ Player Input & Controller
├─ Camera Rigs
├─ Spawning & Pooling
├─ Self-Destructing Effects
├─ Game State via Module + Events
├─ Scene Switching with setActive
└─ HUD / DOM Integration

Guides (интеграционные)
├─ Physics (Rapier/Cannon)
├─ Asset Pipeline
├─ Audio
├─ Post-processing / Custom Render
└─ Debugging & DevTools

TypeScript
├─ Register Pattern
├─ Typed Events
└─ Behaviour & Module Generics

Under the Hood
├─ Bootstrap Phases
├─ Subscription Order Guarantees
├─ Context Resolution
├─ `visible` Patching
├─ childadded and Dynamic Hierarchy
└─ Destroy Semantics

API Reference
└─ (classes & functions by entity)

Examples / Showcase
├─ Snake (step-by-step)
└─ (others)

Design Philosophy
├─ Why Not ECS
├─ Why Not React (Vanilla + OOP rationale)
└─ AI-First: Designing for LLM Coding

Appendix
├─ Migrating an Existing Three.js Project
├─ FAQ
└─ Glossary
```

**Плюсы**: сильный вход, понятный путь, но можно нырять точечно через Patterns/Guides/Reference. Philosophy в конце — для тех, кто уже решил что любит, и хочет углубиться.
**Минусы**: разделов много, нужна хорошая навигация (сайдбар с группами). Потребует больше работы по контенту.

---

## Вариант F — Минималистичный (MVP первой версии доки)

**Логика**: выпустить что-то рабочее за неделю, не за квартал. Все фундаментальные смыслы покрыты, детали — потом.

```
Overview
├─ Why it exists
└─ At a glance (минимальный код)

Installation

Quick Start

Core Concepts
├─ Context, Behaviour, Module
├─ Lifecycle
└─ Activation

Writing Behaviours
└─ (всё про компоненты в одной странице)

Writing Modules
└─ (всё про модули в одной странице)

Recipes
├─ Input
├─ Camera Follow
├─ Physics (pattern only, без deep-dive)
└─ HUD

TypeScript
└─ Register Pattern

API Reference
└─ (flat list)

Example: Snake
```

**Плюсы**: выпускается быстро, легко поддерживать, не перегружает. Хорошо для v0.x.
**Минусы**: не раскрыты инварианты и внутренности — продвинутые пользователи будут лезть в исходники. Нет места под «philosophy», которое нам важно для позиционирования.

---

## Сравнительная таблица вариантов

| Критерий | A Classic | B Journey | C Task | D Entity | E Hybrid | F MVP |
|---|---|---|---|---|---|---|
| Порог входа для новичка | средний | **низкий** | высокий | высокий | **низкий** | низкий |
| Скорость поиска ответа | средняя | низкая | **высокая** | высокая | высокая | средняя |
| Раскрытие философии | среднее | среднее | слабое | слабое | **сильное** | слабое |
| API-покрытие | **сильное** | среднее | среднее | **сильное** | сильное | слабое |
| Трудозатраты на написание | средние | высокие | высокие | средние | **высокие** | **низкие** |
| Подходит для v0.x | нет | нет | нет | нет | нет | **да** |
| Подходит для v1.0 | да | да | да | да | **да** | нет |
| Поддерживает AI / vibe-позицию | слабо | средне | слабо | слабо | **сильно** | слабо |

---

## Предложение

Мой совет — идти так:

1. **На первый релиз** выпустить Вариант **F (MVP)**. Это минимум, который закрывает 80% потребностей и пишется быстро.
2. **По мере роста** расширять до Варианта **E (Hybrid)** — добавлять Patterns, Under the Hood, Philosophy. E — цель на v1.0.
3. **Если запустишься громко и команда подтянется** — можно комбинировать E с элементами C (добавить явный раздел «How to...» над Patterns, для SEO и быстрых ответов).

---

## Открытые вопросы по структуре

Мелочи, которые влияют на раскладку, но не меняют общий скелет. Решить до финальной версии:

- **Overview vs Manifesto vs Introduction**. Название вводной страницы — важно, она продаёт. Варианты: `Introduction`, `Why three-start`, `Overview`, `Motivation`.
- **Philosophy в начале или в конце**. В начале — «я продаю идею сразу», в конце — «для тех, кто уже зашёл». Зависит от целевой аудитории.
- **Where does AI/vibe-coding page live**. Вариант: отдельная страница в Conventions, или как часть Philosophy, или вообще отдельным top-level разделом `For AI Coding`.
- **Examples — внутри docs или отдельный сайт**. У Tanstack `examples/` отдельно. Можно сделать и так, и так. Отдельный — выглядит серьёзнее.
- **API Reference генерить или писать вручную**. Можно TypeDoc + прикрутить к сайту. Но hand-written обычно лучше читается.
- **Internals / Under the Hood: публиковать или нет**. Я бы публиковал — это сигнал «библиотека взрослая, под капотом порядок». Но это контент для ~20% читателей.
- **Playground на сайте**. Stackblitz / CodeSandbox — важен для wow-эффекта. Ставить в Quick Start? В Overview? В отдельную страницу `Try it`?
- **Migration guide / FAQ / Glossary**. Всё опционально, но F не включает — добавим позже.
- **Recipes vs Guides vs Patterns**. Разница: Recipe = «копируй и работает», Pattern = «общая форма», Guide = «пошаговое объяснение». Можно оставить один термин, чтобы не путать. Я бы оставил **Patterns** — звучит менее cookbook, больше архитектурно.
