/* Magic Mirror
 * Module: MMM-voice
 *
 * By fewieden https://github.com/fewieden/MMM-voice
 * MIT Licensed.
 */

Module.register("MMM-voice",{

    icon: "fa-microphone-slash",
    pulsing: true,
    help: false,

    voice: {
        mode: "VOICE",
        sentences: [
            "HIDE MODULES",
            "SHOW MODULES",
            "WAKE UP",
            "GO TO SLEEP",
            "OPEN HELP",
            "CLOSE HELP"
        ]
    },

    modules: [],

    defaults: {
        timeout: 15,
        keyword: "MAGIC MIRROR",
        debug: false
    },

    start: function(){
        this.mode = this.translate("INIT");
        this.modules.push(this.voice);
        Log.log(this.name + " is started!");
        Log.info(this.name + " is waiting for voice modules");
    },

    getStyles: function() {
        return ["font-awesome.css", "MMM-voice.css"];
    },

    getTranslations: function() {
        return {
            en: "translations/en.json",
            de: "translations/de.json"
        };
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        var voice = document.createElement("div");
        voice.classList.add("small", "align-left");
        var i = document.createElement("i");
        i.classList.add("fa", this.icon, "icon");
        if(this.pulsing){
            i.classList.add("pulse");
        }
        voice.appendChild(i);
        var modeSpan = document.createElement("span");
        modeSpan.innerHTML = this.mode;
        voice.appendChild(modeSpan);
        if(this.config.debug){
            var debug = document.createElement("div");
            debug.innerHTML = this.debugInformation;
            voice.appendChild(debug);
        }

        var modules = document.querySelectorAll(".module");
        for (var i = 0; i < modules.length; i++) {
            if(!modules[i].classList.contains(this.name)){
                if(this.help){
                    modules[i].classList.add(this.name + "-blur");
                } else {
                    modules[i].classList.remove(this.name + "-blur");
                }
            }
        }

        if(this.help){
            voice.classList.add(this.name + "-blur");
            var modal = document.createElement("div");
            modal.classList.add("modal");
            this.appendHelp(modal);
            wrapper.appendChild(modal);
        }

        wrapper.appendChild(voice);

        return wrapper;
    },

    notificationReceived: function(notification, payload, sender){
        if(notification === "DOM_OBJECTS_CREATED"){
            this.sendSocketNotification("START", {config: this.config, modules: this.modules});
        } else if(notification === "REGISTER_VOICE_MODULE"){
            if(payload.hasOwnProperty("mode") && payload.hasOwnProperty("sentences")){
                this.modules.push(payload);
            }
        }
    },

    socketNotificationReceived: function(notification, payload){
        if(notification === "READY"){
            this.icon = "fa-microphone";
            this.mode = this.translate("NO_MODE");
            this.pulsing = false;
        } else if(notification === "LISTENING"){
            this.pulsing = true;
        } else if(notification === "SLEEPING"){
            this.pulsing = false;
        } else if(notification === "ERROR"){
            this.mode = notification;
        } else if(notification === "VOICE"){
            for(var i = 0; i < this.modules.length; i++){
                if(payload.mode === this.modules[i].mode){
                    if(this.mode !== payload.mode) {
                        this.help = false;
                        this.sendNotification(notification + '_MODE_CHANGED', {old: this.mode, new: payload.mode});
                        this.mode = payload.mode;
                    }
                    if(this.mode !== "VOICE"){
                        this.sendNotification(notification + '_' + payload.mode, payload.sentence);
                    }
                    break;
                }
            }
        } else if(notification === "BYTES"){
            this.sendNotification("MMM-TTS", payload);
        } else if(notification === "HIDE"){
            MM.getModules().enumerate((module) => {
                module.hide(1000);
            });
        } else if(notification === "SHOW"){
            MM.getModules().enumerate((module) => {
                module.show(1000);
            });
        } else if(notification === "OPEN_HELP"){
            this.help = true;
        } else if(notification === "CLOSE_HELP"){
            this.help = false;
        } else if(notification === "DEBUG"){
            this.debugInformation = payload;
        }
        this.updateDom(300);
    },

    appendHelp: function(appendTo){
        var title = document.createElement("h1");
        title.classList.add("medium");
        title.innerHTML = this.name + " - " + this.translate("COMMAND_LIST");
        appendTo.appendChild(title);

        var mode = document.createElement("div");
        mode.innerHTML = this.translate("MODE") + ": " + this.voice.mode;
        appendTo.appendChild(mode);

        var listLabel = document.createElement("div");
        listLabel.innerHTML = this.translate("VOICE_COMMANDS") + ":";
        appendTo.appendChild(listLabel);

        var list = document.createElement("ul");
        for(var i = 0; i < this.voice.sentences.length; i++){
            var item = document.createElement("li");
            item.innerHTML = this.voice.sentences[i];
            list.appendChild(item);
        }
        appendTo.appendChild(list);
    }
});