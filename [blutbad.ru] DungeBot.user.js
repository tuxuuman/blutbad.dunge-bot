// ==UserScript==
// @name         [blutbad.ru] DungeBot
// @namespace    tuxuuman:blutbad:dangebot
// @version      1.1.0
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

(function() {
    'use strict';
    window.title = "SCRIPT LOADED";
    if (document.getElementById('flashdungeon')) {
        
        console.log("SCRIPT LOADED");
        
        let dungeCfg = null;
        const actions = ["налево", "направо", "вверх", "вниз", "использовать"];
        
        
        // автоматическое поднятие предметов
        unsafeWindow.__oldShowItems = unsafeWindow.showItems;
        unsafeWindow.showItems = function(items) {
            unsafeWindow.__oldShowItems.call(unsafeWindow, items);
            for(let item of items) {
                unsafeWindow.send_ajax(item.type, item.num, item.entry);
                notify(`Подобран предмет: ${item.name}`);
            }
        }

        async function cmd(cmdName, query) {
            let url = "http://damask.blutbad.ru/dungeon_xml.php" + querystring(Object.assign({ cmd: cmdName, nd: getCookie("nd") }, query)) + "&" + Math.random();
            let res = await fetch(url);
            let respText = await res.text();
            if (parser.validate(respText)) {
                let xmlData = parser.parse(respText, {
                    ignoreAttributes : false,
                    parseAttributeValue: true,
                    attributeNamePrefix: ""
                });

                if(xmlData.javascript) {
                    if (xmlData.javascript.value.includes("toBattle")) {
                        unsafeWindow.location.href = '/fbattle.php?' + Math.random()
                        throw {
                            message: "Вы находитесь в бою",
                            name: "jsToBattle",
                            js: xmlData.javascript.value
                        };
                    } else {
                        throw {
                            message: "Сервер прислал JS код",
                            name: "xmlDataJs",
                            js: xmlData.javascript.value
                        };
                    }
                } else {
                    if (cmdName != "getcfg") {
                        if(!xmlData.world) {
                            console.error(`Не валидный ответ сервера "${cmdName}".`, xmlData);
                            throw new Error(`Не валидный ответ сервера "${cmdName}".`);
                        } else {
                            if (xmlData.world.javascript) {
                                if (xmlData.world.javascript.value.includes("toBattle")) {
                                    unsafeWindow.location.href = '/fbattle.php?' + Math.random();
                                    throw {
                                        message: "Вы находитесь в бою",
                                        name: "jsToBattle",
                                        js: xmlData.world.javascript.value
                                    };
                                } else {
                                    console.log("Сервер прислал JS. Выполянем его...", xmlData.world.javascript.value)
                                    unsafeWindow.eval(xmlData.world.javascript.value);
                                }
                            }
                        }
                    }
                }
                return xmlData;
            } else {
                console.error("invalid xml data");
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
            for(let objectsList of Object.values(world.objects)) {
                let objects = [];
                if (Array.isArray(objectsList.object)) {
                    objects = objectsList.object;
                } else if (typeof(objectsList.object) == "object") {
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
            for(let position of world.ways.position) {
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
                for(let type of cfg.datastorage.typedescription.type) {
                    if (type.action) {
                        let actiondescription = cfg.datastorage.actiondescription.action.find((action => action.id == type.action.id));
                        type.action.cmd = actiondescription.cmd;
                    }
                    cfg.typedescription[type.id] = type;
                }
 
                return dungeCfg = cfg;
            }
        }
        
        function querystring (obj) {
            return Object.keys(obj).reduce(function (str, key, i) {
                var delimiter, val;
                delimiter = (i === 0) ? '?' : '&';
                key = encodeURIComponent(key);
                val = encodeURIComponent(obj[key]);
                return [str, delimiter, key, '=', val].join('');
            }, '');
        }
        
        function parseActions(text) {
            return text
                .split("\n")
                .map(str => {
                let actionData = str.split(" ").filter(a => a);
                if (actionData.length) {
                    let actionName = actionData[0].toLowerCase();
                    if (actions.includes(actionName)) {
                        return {
                            name: actionName,
                            params: actionData.splice(1)
                        };
                    }
                }
            })
                .filter(a => a);
        }

        //#region style and template
GM_addStyle(`
.modal {
    position: fixed;
    z-index: 999;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgb(0,0,0);
    background-color: rgba(0,0,0,0.4);
}

.modal-content {
    background-color: #fefefe;
    margin: 15% auto;
    padding: 20px;
    border: 1px solid #888;
    width: 300px;
}

.close {
    color: #aaa;
    float: right;
    font-size: 15px;
    font-weight: bold;
}

.close:hover,
.close:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
} 

.action-editor {
    padding: 10px;
    border: 1px solid black;
}

.action-editor > textarea {
    width: 100%;
    height: 200px;
    border: none;
    resize: none;
    padding: 0;
}

.way-viewer {
    height: 200px;
    border: 1px solid black;
    overflow: auto;
    padding: 10px;
}

.ways-info {
    border-bottom: 1px solid black;
}

.xbbutton {
widnth: 120px !important;
}
`);
        
const botVueTemplate = `
<div id="bot-panel" class="modal" v-show="visible">

  <div class="modal-content">
    <span class="close" @click="visible = false">&times;</span>
    <div id="botSettingsInfo"></div>
   
<div v-if="botStarted">
Бот запущен!
<button class="xbbutton" @click="stopBot()">Stop</button>
</div>
<div v-else>
<div class="action-editor">
                    <textarea
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                        v-model="codeActions"
                    ></textarea>
</div>

<div class="way-viewer">
                    <div class="ways-info">
                        Кол-во команд: {{ actions.length }}
                    </div>
                    <pre>{{ actions }}</pre>
</div>
<button class="xbbutton" @click="startBot(true)">Start</button>
</div>

  </div>

</div>
`;
//#endregion

        $('body').append(botVueTemplate);
        
        async function rotateTo(dir, rotateDir = "L") {
            while (true) {
                let xmlData = await cmd("turnXML", {
                    direction: rotateDir
                });
                if( xmlData.world.hero.direction.value == dir) {
                    return xmlData;
                }
            }
        }
        
        function getWay(ways, x, y) {
            return ways[x + "_" + y];
        }
        
        function lookAround(ways, heroPosition) {
            let objects = {}
            let mods = [
                [-1, 0, "w"],
                [1, 0, "e"],
                [0, -1, "n"],
                [0, 1, "s"]
            ];
            
            for(let m of mods) {
                let wayInfo = getWay(ways, heroPosition.x + m[0] , heroPosition.y + m[1]);
                if (wayInfo && wayInfo.type != "obj_grating_open" && (wayInfo.type.indexOf("obj_") == 0 || wayInfo.type.indexOf("bot_") == 0)) {
                    objects[m[2]] = wayInfo;
                }
            }
            
            return objects;
        }
        
        async function excBotCommand(command) {
            console.log("выполняется команда:"+command.name);
            let xmlData = await cmd("updateXML");
            let hero = xmlData.world.hero;
            let ways = getWays(xmlData.world);
            let objectsAround = lookAround(ways, hero.position);
            
            for(let obj of Object.values(objectsAround)) {
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
                    console.log(`Разворачиваемся ${command.name}..`);
                    await rotateTo(rotateDir);
                }

                console.log("Делаем шаг");
                await cmd("moveXML", {
                    direction: "up"
                });

                if (objectsAround[rotateDir]) {
                    notify("Невозможно сделать шаг. Мешает стена или объект.")
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
                    let dungeCfg = await getDungeCfg();
                    
                    async function use(object) {
                        if (object) {
                            let typeInfo = dungeCfg.typedescription[object.type];
                            if (typeInfo.action) {
                                console.log("используем", object.type);
                                await cmd(typeInfo.action.cmd, { objectId: object.id });
                            } else {
                                console.log(object.type, "нельзя использовать");
                            }
                        } else {
                            console.warn("нельзя использовать пустой объект");
                        }
                    }
                    
                    if (command.params.length) {
                        let [dir] =  command.params;
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
                        
                        await use(object);
                    } else {
                        for(let object of Object.values(objectsAround)) {
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
                    botStarted: false,
                    dungeId: "",
                    __codeActions: "",
                    visible: false
                };
            },
            computed: {
                actions: function() {
                    return parseActions(this.codeActions);
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
                setDungeId(id) {
                    this.dungeId = id;
                    let cfg = loadBotCfg(this.dungeId);
                    this.codeActions = cfg.actionsCfg;
                    if (cfg.started) {
                        this.startBot();
                    }
                },
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
                        
                        (async function(){
                            while (self.botStarted) {
                                let botCfg = loadBotCfg(self.dungeId);
                                let currentAction = aclionList[botCfg.currentActionIndex];
                                if (!currentAction) {
                                    return 1;
                                } else {
                                    let progress = botCfg.currentActionProgress;
                                    let maxProgress = parseInt(currentAction.params[0]) || 1;
                                    if (progress < maxProgress) {
                                        await excBotCommand(currentAction);
                                        updateBotCfg(self.dungeId, { currentActionProgress: progress + 1 });
                                    } else {
                                        updateBotCfg(self.dungeId, { currentActionIndex: botCfg.currentActionIndex + 1, currentActionProgress: 0 });
                                    }
                                }
                            }
                        })().then((status) => {
                            if (status == 1) {
                                 this.stopBot();
                            }
                            notify(`Бот завершил работу`)
                        }).catch(err => {
                            if (err.name == "xmlDataJs") {
                                console.warn("В ответе содержится JS. Выполняем его", err);
                                unsafeWindow.eval(err.js);
                            } else if(err.name == "BattleBegin") {
                                notify("Атакуем монстра!");
                                console.warn("Начинаем бой", err);
                                cmd("attack", { objectId: err.mob.id })
                                    .then(res => {
                                    console.log("не удалось начать бой", res);
                                    setTimeout(()=>{
                                        unsafeWindow.location.reload();
                                    }, 10000);
                                }).catch(console.error)
                            } else if(err.name == "jsToBattle") {
                                console.error("Начинаем бой", err);
                            } else {
                                console.error("В работе бота произошла ошибка", err);
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
        
        function notify(msg, err, title="") {
            if (err) console.error(msg, err, title);
            else console.log(msg, err, title);
            showNotification(msg, err, "[BOT]"+title);
        }
        
        const botBtn = $("<input/>", {
            "class": "xbbutton",
            click: function() {
                app.visible = true;
            },
            value: "Bot",
            type: "button"
        });

        
        $('.right-col .buttons').append(botBtn);   
        
        function loadBotCfg(dungeId) {
            return GM_getValue(dungeId) || {
                actionsCfg: "",
                started: false,
                currentActionIndex: 0,
                currentActionProgress: 0
            };
        }
            
        function parseTypeDescription(dangeCfg) {
            let res = {};
            for(let type of dangeCfg.datastorage.typedescription.type) {
                if (type.action) {
                    let actiondescription = dangeCfg.datastorage.actiondescription.action.find((action => action.id == type.action.id));
                    type.action.cmd = actiondescription.cmd;
                }
                res[type.id] = type;
            }
        }
        
        function setBotCfg(dungeId, cfg) {
            GM_setValue(dungeId, Object.assign({
                actionsCfg: "",
                started: false,
                currentActionIndex: 0,
                currentActionProgress: 0
            },cfg));
        }
        
        function updateBotCfg(dungeId, cfg) {
            setBotCfg(dungeId, Object.assign(loadBotCfg(dungeId), cfg));
        }
        
        (async function() {
            const dungeCfg = await getDungeCfg();
            const dungeId = dungeCfg.datastorage.mainwinlib.path;
            const xmlData = await cmd("updateXML");
            app.setDungeId.call(app, dungeId);
            console.log('dungeCfg',dungeCfg);
            console.log('xmlData',xmlData);
        })().catch(console.error);
        
        
    }
})();
