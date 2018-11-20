// ==UserScript==
// @name         [blutbad.ru] DungeBot
// @namespace    tuxuuman:blutbad:dangebot
// @version      1.0.1
// @description  Бот для прохождения данжей
// @author       tuxuuman<tuxuuman@gmail.com>
// @match        http://damask.blutbad.ru/dungeon.php*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @require      https://cdnjs.cloudflare.com/ajax/libs/fast-xml-parser/3.10.0/parser.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/vue/dist/vue.js
// ==/UserScript==

(function () {
    'use strict';
    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();
    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    window.title = "SCRIPT LOADED";
    if (document.getElementById('flashdungeon')) {
        var cmd = async function cmd(cmdName, query) {
            var url = "http://damask.blutbad.ru/dungeon_xml.php" + querystring(Object.assign({ cmd: cmdName, nd: getCookie("nd") }, query)) + "&" + Math.random();
            var res = await fetch(url);
            var respText = await res.text();
            if (parser.validate(respText)) {
                return parser.parse(respText, {
                    ignoreAttributes: false,
                    parseAttributeValue: true,
                    attributeNamePrefix: ""
                });
            } else {
                console.error("invalid xml data");
                throw new Error("invalid xml data");
            }
        };

        var getCookie = function getCookie(name) {
            var matches = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
            return matches ? decodeURIComponent(matches[1]) : undefined;
        };

        var findPointObject = function findPointObject(x, y, world) {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = Object.values(world.objects)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var objectsList = _step2.value;

                    var objects = [];
                    if (Array.isArray(objectsList.object)) {
                        objects = objectsList.object;
                    } else if (_typeof(objectsList.object) == "object") {
                        objects = [objectsList.object];
                    }

                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = objects[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var object = _step3.value;

                            if (object.position.x == x && object.position.y == y) {
                                return {
                                    x: object.position.x,
                                    y: object.position.y,
                                    type: object.type.value,
                                    id: object.id.value
                                };
                            }
                        }
                    } catch (err) {
                        _didIteratorError3 = true;
                        _iteratorError3 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                _iterator3.return();
                            }
                        } finally {
                            if (_didIteratorError3) {
                                throw _iteratorError3;
                            }
                        }
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            return null;
        };

        var getWays = function getWays(world) {
            var ways = {};
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = world.ways.position[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var position = _step4.value;

                    var type = findPointObject(position.x, position.y, world);
                    ways[position.x + '_' + position.y] = type || position;
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            return ways;
        };

        var rnd = function rnd() {
            var min = void 0,
                max = void 0;
            if (arguments.length == 2) {
                min = arguments.length <= 0 ? undefined : arguments[0];
                max = arguments.length <= 1 ? undefined : arguments[1];
            } else {
                min = 0;
                max = arguments.length <= 0 ? undefined : arguments[0];
            }
            return Math.floor(Math.random() * max + min);
        };

        var randomValue = function randomValue() {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            return args[rnd(args.length)];
        };

        var getDungeCfg = async function getDungeCfg() {
            if (dungeCfg) {
                return dungeCfg;
            } else {
                var cfg = await cmd("getcfg");
                cfg.typedescription = {};
                // парсим описание типов объектов
                var _iteratorNormalCompletion5 = true;
                var _didIteratorError5 = false;
                var _iteratorError5 = undefined;

                try {
                    var _loop = function _loop() {
                        var type = _step5.value;

                        if (type.action) {
                            var actiondescription = cfg.datastorage.actiondescription.action.find(function (action) {
                                return action.id == type.action.id;
                            });
                            type.action.cmd = actiondescription.cmd;
                        }
                        cfg.typedescription[type.id] = type;
                    };

                    for (var _iterator5 = cfg.datastorage.typedescription.type[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                        _loop();
                    }
                } catch (err) {
                    _didIteratorError5 = true;
                    _iteratorError5 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion5 && _iterator5.return) {
                            _iterator5.return();
                        }
                    } finally {
                        if (_didIteratorError5) {
                            throw _iteratorError5;
                        }
                    }
                }

                return dungeCfg = cfg;
            }
        };

        var querystring = function querystring(obj) {
            return Object.keys(obj).reduce(function (str, key, i) {
                var delimiter, val;
                delimiter = i === 0 ? '?' : '&';
                key = encodeURIComponent(key);
                val = encodeURIComponent(obj[key]);
                return [str, delimiter, key, '=', val].join('');
            }, '');
        };

        var parseActions = function parseActions(text) {
            return text.split("\n").map(function (str) {
                var actionData = str.split(" ").filter(function (a) {
                    return a;
                });
                if (actionData.length) {
                    var actionName = actionData[0].toLowerCase();
                    if (actions.includes(actionName)) {
                        return {
                            name: actionName,
                            params: actionData.splice(1)
                        };
                    }
                }
            }).filter(function (a) {
                return a;
            });
        };

        var validateXmlData = function validateXmlData(xmlData) {
            if (!xmlData.world && xmlData.javascript) {
                throw {
                    message: "В ответе содержится JS код",
                    name: "xmlDataJs",
                    js: xmlData.javascript.value
                };
            } else if (!xmlData.world) {
                console.error('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0443 "' + command.name + '".', xmlData);
                throw new Error('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u0443 "' + command.name + '".');
            }

            return xmlData;
        };

        var rotateTo = async function rotateTo(dir) {
            var rotateDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "L";

            while (true) {
                var xmlData = validateXmlData((await cmd("turnXML", {
                    direction: rotateDir
                })));
                if (xmlData.world.hero.direction.value == dir) {
                    return xmlData;
                }
            }
        };

        var getWay = function getWay(ways, x, y) {
            return ways[x + "_" + y];
        };

        var pathIsClear = function pathIsClear(ways, x, y) {
            var wayInfo = getWay(ways, x, y);
            return wayInfo && ["cell", "obj_grating_open"].includes(wayInfo.type);
        };

        var lookAround = function lookAround(ways, heroPosition) {
            var objects = {};
            var wayInfo = null;
            var mods = [[-1, 0, "w"], [1, 0, "e"], [0, -1, "n"], [0, 1, "s"]];

            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
                for (var _iterator6 = mods[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var m = _step6.value;

                    var _wayInfo = getWay(ways, heroPosition.x + m[0], heroPosition.y + m[1]);
                    if (_wayInfo && (_wayInfo.type.indexOf("obj_") == 0 || _wayInfo.type.indexOf("bot_") == 0)) {
                        objects[m[2]] = _wayInfo;
                    }
                }
            } catch (err) {
                _didIteratorError6 = true;
                _iteratorError6 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                        _iterator6.return();
                    }
                } finally {
                    if (_didIteratorError6) {
                        throw _iteratorError6;
                    }
                }
            }

            return objects;
        };

        var excBotCommand = async function excBotCommand(command) {
            console.log("выполняется команда:" + command.name);
            var xmlData = validateXmlData((await cmd("updateXML")));
            var hero = xmlData.world.hero;
            var ways = getWays(xmlData.world);
            var objectsAround = lookAround(ways, hero.position);

            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = Object.values(objectsAround)[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var obj = _step7.value;

                    // если рядом есть моб то атакуем его
                    if (obj.type.indexOf("bot_") == 0) {
                        throw {
                            name: "BattleBegin",
                            mob: obj
                        };
                    }
                }
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                        _iterator7.return();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
                    }
                }
            }

            async function toStep(rotateDir) {
                if (!objectsAround[rotateDir]) {
                    if (hero.direction.value != rotateDir) {
                        console.log('\u0420\u0430\u0437\u0432\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u043C\u0441\u044F ' + command.name + '..');
                        await rotateTo(rotateDir);
                    }

                    console.log("Делаем шаг");
                    await cmd("moveXML", {
                        direction: "up"
                    });
                } else {
                    throw new Error("Невозможно сделать шаг " + command.name);
                }
            }

            switch (command.name) {
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
                    var _dungeCfg = await getDungeCfg();

                    var use = async function use(object) {
                        if (object) {
                            var typeInfo = _dungeCfg.typedescription[object.type];
                            if (typeInfo.action) {
                                console.log("используем", object.type);
                                await cmd(typeInfo.action.cmd, { objectId: object.id });
                            } else {
                                console.log(object.type, "нельзя использовать");
                            }
                        } else {
                            console.warn("нельзя использовать пустой объект");
                        }
                    };

                    if (command.params.length) {
                        var _command$params = _slicedToArray(command.params, 1),
                            dir = _command$params[0];

                        var object = null;

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

                        await use(object);
                    } else {
                        var _iteratorNormalCompletion8 = true;
                        var _didIteratorError8 = false;
                        var _iteratorError8 = undefined;

                        try {
                            for (var _iterator8 = Object.values(objectsAround)[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                                var _object = _step8.value;

                                await use(_object);
                            }
                        } catch (err) {
                            _didIteratorError8 = true;
                            _iteratorError8 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion8 && _iterator8.return) {
                                    _iterator8.return();
                                }
                            } finally {
                                if (_didIteratorError8) {
                                    throw _iteratorError8;
                                }
                            }
                        }
                    }
                    break;

                default:
                    throw new Error('\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043A\u043E\u043C\u0430\u043D\u0434\u0430: "' + command.name + '"');
            }
        };

        var notify = function notify(msg, err) {
            var title = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";

            if (err) console.error(msg, err, title);else console.log(msg, err, title);
            showNotification(msg, err, "[BOT]" + title);
        };

        var loadBotCfg = function loadBotCfg(dungeId) {
            return GM_getValue(dungeId) || {
                actionsCfg: "",
                started: false,
                currentActionIndex: 0,
                currentActionProgress: 0
            };
        };

        var parseTypeDescription = function parseTypeDescription(dangeCfg) {
            var res = {};
            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
                var _loop2 = function _loop2() {
                    var type = _step9.value;

                    if (type.action) {
                        var actiondescription = dangeCfg.datastorage.actiondescription.action.find(function (action) {
                            return action.id == type.action.id;
                        });
                        type.action.cmd = actiondescription.cmd;
                    }
                    res[type.id] = type;
                };

                for (var _iterator9 = dangeCfg.datastorage.typedescription.type[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                    _loop2();
                }
            } catch (err) {
                _didIteratorError9 = true;
                _iteratorError9 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion9 && _iterator9.return) {
                        _iterator9.return();
                    }
                } finally {
                    if (_didIteratorError9) {
                        throw _iteratorError9;
                    }
                }
            }
        };

        var setBotCfg = function setBotCfg(dungeId, cfg) {
            GM_setValue(dungeId, Object.assign({
                actionsCfg: "",
                started: false,
                currentActionIndex: 0,
                currentActionProgress: 0
            }, cfg));
        };

        var updateBotCfg = function updateBotCfg(dungeId, cfg) {
            setBotCfg(dungeId, Object.assign(loadBotCfg(dungeId), cfg));
        };

        console.log("SCRIPT LOADED");

        var dungeCfg = null;
        var actions = ["налево", "направо", "вверх", "вниз", "использовать"];

        // автоматическое поднятие предметов
        unsafeWindow.__oldShowItems = unsafeWindow.showItems;
        unsafeWindow.showItems = function (items) {
            unsafeWindow.__oldShowItems.call(unsafeWindow, items);
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = items[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var item = _step.value;

                    unsafeWindow.send_ajax(item.type, item.num, item.entry);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            console.log(items);
        };

        GM_addStyle('\n.modal {\n    position: fixed;\n    z-index: 999;\n    left: 0;\n    top: 0;\n    width: 100%;\n    height: 100%;\n    overflow: auto;\n    background-color: rgb(0,0,0);\n    background-color: rgba(0,0,0,0.4);\n}\n\n.modal-content {\n    background-color: #fefefe;\n    margin: 15% auto;\n    padding: 20px;\n    border: 1px solid #888;\n    width: 300px;\n}\n\n.close {\n    color: #aaa;\n    float: right;\n    font-size: 15px;\n    font-weight: bold;\n}\n\n.close:hover,\n.close:focus {\n    color: black;\n    text-decoration: none;\n    cursor: pointer;\n} \n\n.action-editor {\n    padding: 10px;\n    border: 1px solid black;\n}\n\n.action-editor > textarea {\n    width: 100%;\n    height: 200px;\n    border: none;\n    resize: none;\n    padding: 0;\n}\n\n.way-viewer {\n    height: 200px;\n    border: 1px solid black;\n    overflow: auto;\n    padding: 10px;\n}\n\n.ways-info {\n    border-bottom: 1px solid black;\n}\n\n.xbbutton {\nwidnth: 120px !important;\n}\n');

        var botVueTemplate = '\n<div id="bot-panel" class="modal" v-show="visible">\n\n  <div class="modal-content">\n    <span class="close" @click="visible = false">&times;</span>\n    <div id="botSettingsInfo"></div>\n   \n<div v-if="botStarted">\n\u0411\u043E\u0442 \u0437\u0430\u043F\u0443\u0449\u0435\u043D!\n<button class="xbbutton" @click="stopBot()">Stop</button>\n</div>\n<div v-else>\n<div class="action-editor">\n                    <textarea\n                        autocomplete="off"\n                        autocorrect="off"\n                        autocapitalize="off"\n                        spellcheck="false"\n                        v-model="codeActions"\n                    ></textarea>\n</div>\n\n<div class="way-viewer">\n                    <div class="ways-info">\n                        \u041A\u043E\u043B-\u0432\u043E \u043A\u043E\u043C\u0430\u043D\u0434: {{ actions.length }}\n                    </div>\n                    <pre>{{ actions }}</pre>\n</div>\n<button class="xbbutton" @click="startBot(true)">Start</button>\n</div>\n\n  </div>\n\n</div>\n';
        $('body').append(botVueTemplate);

        var app = new Vue({
            el: "#bot-panel",
            data: function data() {
                return {
                    botStarted: false,
                    dungeId: "",
                    __codeActions: "",
                    visible: false
                };
            },

            computed: {
                actions: function actions() {
                    return parseActions(this.codeActions);
                },
                codeActions: {
                    set: function set(value) {
                        this.$data.__codeActions = value;
                    },
                    get: function get() {
                        return this.$data.__codeActions;
                    }
                }
            },
            methods: {
                setDungeId: function setDungeId(id) {
                    this.dungeId = id;
                    var cfg = loadBotCfg(this.dungeId);
                    this.codeActions = cfg.actionsCfg;
                    if (cfg.started) {
                        this.startBot();
                    }
                },
                startBot: function startBot(clicked) {
                    var _this = this;

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

                        var aclionList = this.actions;
                        var self = this;

                        (async function () {
                            while (self.botStarted) {
                                var botCfg = loadBotCfg(self.dungeId);
                                var currentAction = aclionList[botCfg.currentActionIndex];
                                if (!currentAction) {
                                    return 1;
                                } else {
                                    var progress = botCfg.currentActionProgress;
                                    var maxProgress = parseInt(currentAction.params[0]) || 1;
                                    if (progress < maxProgress) {
                                        await excBotCommand(currentAction);
                                        updateBotCfg(self.dungeId, { currentActionProgress: progress + 1 });
                                    } else {
                                        updateBotCfg(self.dungeId, { currentActionIndex: botCfg.currentActionIndex + 1, currentActionProgress: 0 });
                                    }
                                }
                            }
                        })().then(function (status) {
                            if (status == 1) {
                                _this.stopBot();
                            }
                            notify('\u0411\u043E\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0440\u0430\u0431\u043E\u0442\u0443');
                        }).catch(function (err) {
                            if (err.name == "xmlDataJs") {
                                console.warn("В ответе содержится JS. Выполняем его", err);
                                eval(err.js);
                            } else if (err.name == "BattleBegin") {
                                notify("Атакуем монстра!");
                                console.warn("Начинаем бой", err);
                                cmd("attack", { objectId: err.mob.id }).then(function (res) {
                                    console.log("res", res);
                                    if (res.javascript) {
                                        eval(res.javascript.value);
                                    }

                                    if (res.world && res.world.javascript) {
                                        eval(res.world.javascript.value);
                                    }
                                });
                                setTimeout(function () {
                                    unsafeWindow.location.reload();
                                }, 10000);
                            } else {
                                console.error("В работе бота произошла ошибка", err);
                                notify('\u0412 \u0440\u0430\u0431\u043E\u0442\u0435 \u0431\u043E\u0442\u0430 \u043F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 <br/>[' + err.message + ']', true);
                                _this.stopBot();
                            }
                        });
                    }
                },
                stopBot: function stopBot() {
                    if (this.botStarted) {
                        this.botStarted = false;
                        updateBotCfg(this.dungeId, {
                            started: false
                        });
                    }
                }
            }
        });

        var botBtn = $("<input/>", {
            "class": "xbbutton",
            click: function click() {
                app.visible = true;
            },
            value: "Bot",
            type: "button"
        });

        $('.right-col .buttons').append(botBtn);

        (async function () {
            var dungeCfg = await getDungeCfg();
            if (!dungeCfg.datastorage & dungeCfg.javascript) {
                eval(dungeCfg.javascript.value);
            } else if (!dungeCfg.datastorage) {
                throw new Error("Не валидный конфиг подземелья");
            }
            var dungeId = dungeCfg.datastorage.mainwinlib.path;
            var xmlData = await cmd("updateXML");
            app.setDungeId.call(app, dungeId);
            console.log('dungeCfg', dungeCfg);
            console.log('xmlData', xmlData);
        })().catch(console.error);
    }
})();
