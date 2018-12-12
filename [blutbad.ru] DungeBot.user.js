// ==UserScript==
// @name         [blutbad.ru] DungeBot
// @namespace    tuxuuman:blutbad:dangebot
// @version      1.5.6
// @description  Бот для прохождения данжей
// @author       tuxuuman<tuxuuman@gmail.com>
// @match        http://damask.blutbad.ru/dungeon.php*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @require      https://cdnjs.cloudflare.com/ajax/libs/fast-xml-parser/3.10.0/parser.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/vue@2.5.17/dist/vue.min.js
// ==/UserScript==

(function () {
    'use strict';
    window.title = "SCRIPT LOADED";
    if (document.getElementById('flashdungeon')) {

        const logger = {
            log(...args) {
                console.log(`======${(new Date).toLocaleString()}======\n`, ...args, "\n===============================\n\n");
            },
            warn(...args) {
                console.warn(`******${(new Date).toLocaleString()}******\n`, ...args, "\n*******************************\n\n");
            },
            error(...args) {
                console.error(`######${(new Date).toLocaleString()}######\n`, ...args, "\n###############################\n\n");
            }
        }

        logger.log("SCRIPT LOADED");

        let dungeCfg = null;

        const actionsConfig = {
            "налево": {
                params: [
                    {
                        type: "number",
                        default: 1
                    }
                ],
                progress: true
            },
            "направо": {
                params: [
                    {
                        type: "number",
                        default: 1,
                    }
                ],
                progress: true
            },
            "вверх": {
                params: [
                    {
                        type: "number",
                        default: 1,
                    }
                ],
                progress: true
            },
            "вниз": {
                params: [
                    {
                        type: "number",
                        default: 1,
                    }
                ],
                progress: true
            },
            "использовать": {
                params: [
                    {
                        validate: (val) => ["слева", "справа", "снизу", "сверху"].includes(val),
                        validateErrorMessage: `Возможные значиения: слева", справа, снизу", сверху`
                    }
                ]
            },
            "установить_паузу": {
                params: [
                    {
                        type: "float",
                        required: true
                    }
                ]
            }
        };

        function alert(text) {
            logger.log("ALERT", text);
        }

        unsafeWindow.alert = alert;

        // автоматическое поднятие предметов
        unsafeWindow.__oldShowItems = unsafeWindow.showItems;
        unsafeWindow.showItems = function (items) {
            unsafeWindow.__oldShowItems.call(unsafeWindow, items);
            for (let item of items) {
                unsafeWindow.send_ajax(item.type, item.num, item.entry);
                notify(`Подобран предмет: ${item.name}`);
            }
        }

        async function cmd(cmdName, query) {
            let url = "http://damask.blutbad.ru/dungeon_xml.php?" + querystring(Object.assign({ cmd: cmdName, nd: getCookie("nd") }, query)) + "&" + Math.random();
            let res = await fetch(url);
            let respText = await res.text();
            if (parser.validate(respText)) {
                let xmlData = parser.parse(respText, {
                    ignoreAttributes: false,
                    parseAttributeValue: true,
                    attributeNamePrefix: ""
                });
                
                logger.log("\n\n", cmdName, "xmlData", respText, "\n\n");

                if (xmlData.javascript) {
                    if (xmlData.javascript.value.includes("toBattle")) {
                        unsafeWindow.location.href = '/fbattle.php?' + Math.random();
                        throw {
                            message: "Вы находитесь в бою",
                            name: "jsToBattle",
                            js: xmlData.javascript.value
                        };
                    }
                } else {
                    if (cmdName != "getcfg") {
                        if (!xmlData.world) {
                            logger.error(`Не валидный ответ сервера "${cmdName}".`, xmlData);
                            throw new Error(`Не валидный ответ сервера "${cmdName}".`);
                        } else {
                            if (xmlData.world.javascript) {
                                if (xmlData.world.javascript.value.includes("toBattle")) {
                                    logger.warn("xmlData.world.javascript exist toBattle()");
                                } else {
                                    //logger.log("Сервер прислал JS. Выполянем его...", xmlData.world.javascript.value)
                                    unsafeWindow.eval(xmlData.world.javascript.value);
                                }
                            }
                        }
                    }
                }
                return xmlData;
            } else {
                logger.error("invalid xml data");
                throw new Error("invalid xml data");
            }
        }
        function getCookie(name) {
            var matches = document.cookie.match(new RegExp(
                "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
            ));
            return matches ? decodeURIComponent(matches[1]) : undefined;
        }

        function findPointObject(x, y, world) {
            for (let objectsList of Object.values(world.objects)) {
                let objects = [];
                if (Array.isArray(objectsList.object)) {
                    objects = objectsList.object;
                } else if (typeof (objectsList.object) == "object") {
                    objects = [objectsList.object];
                }

                for (let object of objects) {
                    if (object.position.x == x && object.position.y == y) {
                        return {
                            x: object.position.x,
                            y: object.position.y,
                            type: object.type.value,
                            id: object.id.value
                        };
                    }
                }
            }

            return null;
        }

        function getWays(world) {
            const ways = {};
            for (let position of world.ways.position) {
                let type = findPointObject(position.x, position.y, world);
                ways[`${position.x}_${position.y}`] = type || position;
            }
            return ways;
        }

        function rnd(...args) {
            let min, max;
            if (args.length == 2) {
                min = args[0];
                max = args[1];
            } else {
                min = 0;
                max = args[0];
            }
            return Math.floor(Math.random() * max + min);
        }

        function randomValue(...args) {
            return args[rnd(args.length)];
        }

        async function getDungeCfg() {
            if (dungeCfg) {
                return dungeCfg;
            } else {
                let cfg = await cmd("getcfg");
                cfg.typedescription = {};
                // парсим описание типов объектов
                for (let type of cfg.datastorage.typedescription.type) {
                    if (type.action) {
                        let actiondescription = cfg.datastorage.actiondescription.action.find((action => action.id == type.action.id));
                        type.action.cmd = actiondescription.cmd;
                    }
                    cfg.typedescription[type.id] = type;
                }

                return dungeCfg = cfg;
            }
        }

        function querystring(params) {
            return Object.keys(params).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key])).join('&');
        }

        function parseActions(text) {
            let res = [];
            text.split("\n").forEach((str, strIdx) => {
                if (!str.length) return;

                let actionData = str.split(" ").filter(a => a);
                if (actionData.length) {
                    let actionName = actionData[0].toLowerCase();
                    let actionParams = actionData.splice(1);

                    let action = {
                        name: actionName,
                        params: []
                    };

                    if (actionsConfig[actionName]) {
                        let actionCfg = actionsConfig[actionName];
                        if (actionCfg.params) {
                            actionCfg.params.forEach((param, paramIdx) => {
                                if (param.required && actionParams[paramIdx] === undefined) {
                                    throw {
                                        name: "UndefinedRequiredParams",
                                        message: `Не указан требуемый параметр №${paramIdx + 1}. Команда: "${actionName}". Строка №${strIdx+1}`,
                                        actionName,
                                        actionIndex: strIdx
                                    }
                                } else if (actionParams[paramIdx] === undefined && param.default !== undefined) {
                                    // если параметр не указан, то используем значение по умолчанию
                                    action.params.push(param.default);
                                } else if (typeof (param.validate) == "function" && actionParams[paramIdx] !== undefined) {
                                    if (param.validate(actionParams[paramIdx])) {
                                        action.params.push(actionParams[paramIdx]);
                                    } else {
                                        throw {
                                            name: "ErrorValidateParams",
                                            message: `Ошибка валидации параметра №${paramIdx + 1}. Команда: "${actionName}". Строка №${strIdx+1}. ${param.validateErrorMessage || ""}`,
                                            actionName,
                                            actionIndex: strIdx
                                        }
                                    }
                                } else if (typeof (param.transform) == Function || param.type) {
                                    let transform = param.transform || function (val) {
                                        if (param.type == "number" || param.type == "float") {
                                            let parsedVal = param.type == "number" ? parseInt(val) : parseFloat(val);
                                            if (Number.isNaN(parsedVal)) {
                                                throw {
                                                    name: "ErrorValidateParams",
                                                    message: `Ошибка валидации параметра №${paramIdx + 1}. Команда: "${actionName}". Строка №${strIdx+1}. Параметр должен быть числом`,
                                                    actionName,
                                                    actionIndex: strIdx
                                                }
                                            } else return parsedVal;
                                            
                                        } else {
                                            return val;
                                        }
                                    };
                                    action.params.push(transform(actionParams[paramIdx]));
                                } else if(actionParams[paramIdx] !== undefined) {
                                    action.params.push(actionParams[paramIdx]);
                                }
                            });
                        }
                        res.push(action);
                    } else {
                        if (actionName.indexOf("#") !== 0) {
                            throw {
                                name: "UnknownCommandName",
                                message: `Неизвестаня команда. Команда: "${actionName}". Строка №${strIdx+1}`,
                                actionName,
                                actionIndex: strIdx
                            }
                        }
                    }


                }
            });
            return res;
        }

        //#region style and template
        GM_addStyle(`.modal { position: fixed; z-index: 999; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgb(0,0,0); background-color: rgba(0,0,0,0.4); } .modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 300px; } .close { color: #aaa; float: right; font-size: 15px; font-weight: bold; } .close:hover, .close:focus { color: black; text-decoration: none; cursor: pointer; } .action-editor { padding: 10px; border: 1px solid black; } .action-editor > textarea { width: 100%; height: 200px; border: none; resize: none; padding: 0; } .way-viewer { height: 200px; border: 1px solid black; overflow: auto; padding: 10px; } .ways-info { border-bottom: 1px solid black; } .xbbutton { widnth: 120px !important; }`);
        const botVueTemplate = ` <div id="bot-panel" class="modal" v-show="visible"> <div class="modal-content"> <span class="close" @click="visible = false">&times;</span> <div id="botSettingsInfo"></div> <div v-if="botStarted"> Бот запущен! <button class="xbbutton" @click="stopBot()">Stop</button> </div> <div v-else> <div class="action-editor"> <div style="color:red; margin-bottom: 5px;">{{ actionError }}</div> <textarea autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" v-model="codeActions" ></textarea> </div> <div class="way-viewer"> <div class="ways-info"> Кол-во команд: {{ actions.length }} </div> <pre>{{ actions }}</pre> </div> <button class="xbbutton" @click="startBot(true)">Start</button> </div> </div> </div> `;
        //#endregion

        $('body').append(botVueTemplate);

        async function rotateTo(targetDirection, heroDirection) {
            let direction = "L";

            if (heroDirection == "w" && (targetDirection == "n")) {
                // с запада на север
                direction = "R"
            } else if (heroDirection == "n" && (targetDirection == "e")) {
                // с севера на восток
                direction = "R"
            } else if (heroDirection == "e" && (targetDirection == "s")) {
                // с востока на юг
                direction = "R"
            } else if (heroDirection == "s" && (targetDirection == "w")) {
                // с юга на запад
                direction = "R"
            } else {
                direction = "L"
            }

            while (true) {
                let xmlData = await cmd("turnXML", { direction });

                if (xmlData.world.hero.direction.value == targetDirection) {
                    return xmlData;
                }
            }
        }

        function pause(seconds) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 1000 * seconds);
            });
        }

        function getWay(ways, x, y) {
            return ways[x + "_" + y];
        }

        function lookAround(world, heroPosition) {
            let objects = {}
            let mods = [
                [-1, 0, "w"],
                [1, 0, "e"],
                [0, -1, "n"],
                [0, 1, "s"]
            ];

            for (let m of mods) {
                let wayInfo = findPointObject(heroPosition.x + m[0], heroPosition.y + m[1], world);

                if (wayInfo && wayInfo.type != "obj_grating_open" && (wayInfo.type.indexOf("obj_") == 0 || wayInfo.type.indexOf("bot_") == 0  || wayInfo.type == "wall")) {
                    objects[m[2]] = wayInfo;
                }
            }

            return objects;
        }

        async function excBotCommand(command, commandNumber, commandProgress, dungeId) {
            logger.log("выполняется команда:" + command.name + `[${commandNumber}:${commandProgress}]`);
            let xmlData = await cmd("updateXML");
            let hero = xmlData.world.hero;

            let objectsAround = lookAround(xmlData.world, hero.position);
            
            for (let obj of Object.values(objectsAround)) {
                // если рядом есть моб то атакуем его
                if (obj.type.indexOf("bot_") == 0) {
                    throw {
                        name: "BattleBegin",
                        mob: obj
                    }
                }
            }

            async function toStep(rotateDir) {
                if (hero.direction.value != rotateDir) {
                    logger.log(`Разворачиваемся ${command.name}..`);
                    await rotateTo(rotateDir, hero.direction.value);
                }

                logger.log("Делаем шаг", rotateDir);
                //logger.log("objectsAround", objectsAround);
                await cmd("moveXML", {
                    direction: "up"
                });

                if (objectsAround[rotateDir]) {
                    logger.error("Невозможно сделать шаг. Мешает стена или объект.", `Команда: ${command.name}. Строка ${commandNumber}. Шаг ${commandProgress + 1}`, objectsAround[rotateDir]);
                }
            }

            switch (command.name) {
                case "установить_паузу":
                    pauseDuration = parseFloat(command.params[0]);

                    if (isNaN(pauseDuration) || pauseDuration < 0) {
                        pauseDuration = 0
                    }

                    updateBotCfg(dungeId, { pauseDuration });

                    notify(`Изменение паузе на ${pauseDuration} сек.`)
                    
                    break;

                case "налево":
                    await toStep("w");
                    break;

                case "направо":
                    await toStep("e");

                    break;

                case "вверх":
                    await toStep("n");
                    break;

                case "вниз":
                    await toStep("s");
                    break;

                case "использовать":
                    let dungeCfg = await getDungeCfg();

                    async function use(object) {
                        if (object) {
                            if (object.type == "obj_switched") {
                                logger.warn("заблокирована попытка закрыть решетку");
                                return;
                            }
                            let typeInfo = dungeCfg.typedescription[object.type];
                            if (typeInfo.action) {
                                logger.log("используем", object.type);
                                await cmd(typeInfo.action.cmd, { objectId: object.id });
                            } else {
                                logger.log(object.type, "нельзя использовать");
                            }
                        } else {
                            logger.warn("нельзя использовать пустой объект");
                        }
                    }

                    if (command.params.length) {
                        let [dir] = command.params;
                        let object = null;

                        switch (dir) {
                            case "слева":
                                object = objectsAround["w"];
                                break;

                            case "справа":
                                object = objectsAround["e"];
                                break;

                            case "снизу":
                                object = objectsAround["s"];
                                break;

                            case "сверху":
                                object = objectsAround["n"];
                                break;
                        }
                        if (object) await use(object);
                    } else {
                        for (let object of Object.values(objectsAround)) {
                            await use(object);
                        }
                    }
                    break;

                default: throw new Error(`Неизвестная команда: "${command.name}"`);
            }
        }

        var app = new Vue({
            el: "#bot-panel",
            data() {
                return {
                    dungeCfg: null,
                    actionError: "",
                    botStarted: false,
                    __codeActions: "",
                    visible: false
                };
            },
            created() {
                getDungeCfg()
                    .then(dungeCfg => {
                        this.dungeCfg = dungeCfg;

                        let cfg = loadBotCfg(this.dungeId);
                        this.codeActions = cfg.actionsCfg;
    
                        if (cfg.started) {
                            this.startBot();
                        }
                    })
                    .catch((err => {
                        logger.error("ошибка инициализации бота", err.message, err)
                    }));
            },
            computed: {
                dungeId() {
                    return dungeCfg ? this.dungeCfg.datastorage.mainwinlib.path : null;
                },
                actions: function () {
                    let actions = [];
                    try {
                        actions = parseActions(this.codeActions);
                        this.actionError = "";
                    } catch (err) {
                        this.actionError = err.message;
                    }
                    return actions;
                },
                codeActions: {
                    set(value) {
                        this.$data.__codeActions = value;
                    },
                    get() {
                        return this.$data.__codeActions;
                    }
                },
            },
            methods: {
                startBot(clicked) {
                    if (!this.actions.length) {
                        notify("Список действий не может быть пустым", true);
                        return;
                    }
                    if (!this.botStarted) {
                        this.botStarted = true;

                        if (clicked) {
                            setBotCfg(this.dungeId, {
                                actionsCfg: this.codeActions,
                                started: true
                            });
                            notify("Бот запущен!");
                        } else {
                            updateBotCfg(this.dungeId, {
                                actionsCfg: this.codeActions
                            });
                        }

                        let aclionList = this.actions;
                        const self = this;

                        (async function () {
                            while (self.botStarted) {
                                let botCfg = loadBotCfg(self.dungeId);
                                let currentAction = aclionList[botCfg.currentActionIndex];
                                if (!currentAction) {
                                    return 1;
                                } else {
                                    let progress =  botCfg.currentActionProgress;
                                    let maxProgress = actionsConfig[currentAction.name].progress ? currentAction.params[0] : 1;
                                    if (progress < maxProgress) {
                                        await excBotCommand(currentAction, botCfg.currentActionIndex, progress, self.dungeId);
                                        updateBotCfg(self.dungeId, { currentActionProgress: progress + 1 });
                                    } else {
                                        updateBotCfg(self.dungeId, { currentActionIndex: botCfg.currentActionIndex + 1, currentActionProgress: 0 });
                                    }
                                    await pause(botCfg.pauseDuration);
                                }
                            }
                        })().then((status) => {
                            if (status == 1) {
                                this.stopBot();
                            }
                            notify(`Бот завершил работу`)
                        }).catch(err => {
                            if (err.name == "BattleBegin") {
                                logger.warn("Атакуем монстра!", err.mob);
                                cmd("attack", { objectId: err.mob.id })
                                    .then(res => {
                                        if (res.world.javascript && res.world.javascript.value.includes("toBattle")) {
                                            logger.warn("Переходим на страницу боя", err);
                                            unsafeWindow.location.href = '/fbattle.php?' + Math.random();
                                        } else {
                                            logger.error("Не удалось начать бой. Обновляем страницу...", res);
                                            setTimeout(() => {
                                                unsafeWindow.location.reload();
                                            }, 10000);
                                        }
                                    }).catch(err => {
                                        logger.error("Не удалось начать бой. Ошибка.", err.message, err);
                                    })
                            } else if (err.name == "jsToBattle") {
                                logger.error("Начался бой", err);
                            } else {
                                logger.error("В работе бота произошла ошибка", err);
                                notify(`В работе бота произошла ошибка <br/>[${err.message}]`, true);
                                this.stopBot();
                            }
                        });
                    }
                },
                stopBot() {
                    if (this.botStarted) {
                        this.botStarted = false;
                        updateBotCfg(this.dungeId, {
                            started: false
                        });
                    }
                }
            }
        });

        function notify(msg, err, title = "") {
            if (err) logger.error(msg);
            else logger.log(msg);
            showNotification(msg, err, "[BOT]" + title);
        }

        const botBtn = $("<input/>", {
            "class": "xbbutton",
            click: function () {
                app.visible = true;
            },
            value: "Bot",
            type: "button"
        });


        $('.right-col .buttons').append(botBtn);

        const DEFAULT_BOT_CFG = {
            actionsCfg: "",
            started: false,
            currentActionIndex: 0,
            currentActionProgress: 0,
            pauseDuration: 1
        };

        function loadBotCfg(dungeId) {
            return GM_getValue(dungeId, DEFAULT_BOT_CFG);
        }

        function setBotCfg(dungeId, cfg) {
            GM_setValue(dungeId, Object.assign(DEFAULT_BOT_CFG, cfg));
        }

        function updateBotCfg(dungeId, cfg) {
            GM_setValue(dungeId, Object.assign(loadBotCfg(dungeId), cfg));
        }
    }
})();
