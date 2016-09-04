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
    modules: [
        {
            mode: 'voice',
            sentences: [
                'hide modules',
                'show modules',
                'turn on',
                'turn off',
                'open help',
                'close help'
            ]
        }
    ],

    defaults: {
        timeout: 15,
        keyword: "magic mirror",
        debug: false
    },

    start: function(){
        this.mode = this.translate("INIT");
        Log.log(this.name + ' is started!');
        Log.info(this.name + ' is waiting for voice modules');
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
        wrapper.classList.add('small', 'align-left');
        var i = document.createElement("i");
        i.classList.add('fa', this.icon, 'icon');
        if(this.pulsing){
            i.classList.add('pulse');
        }
        var modeSpan = document.createElement("span");
        modeSpan.innerHTML = this.mode;
        wrapper.appendChild(i);
        wrapper.appendChild(modeSpan);
        if(this.config.debug){
            var debug = document.createElement("div");
            debug.innerHTML = this.debugInformation;
            wrapper.appendChild(debug);
        }
        if(this.help){
            document.querySelector('body').classList.add('MMM-voice-blur');
        } else {
            document.querySelector('body').classList.remove('MMM-voice-blur');
        }
        return wrapper;
    },

    notificationReceived: function(notification, payload, sender){
        if(notification === 'DOM_OBJECTS_CREATED'){
            this.sendSocketNotification('START', {'config': this.config, 'modules': this.modules});
        } else if(notification === 'REGISTER_VOICE_MODULE'){
            if(payload.hasOwnProperty('mode') && payload.hasOwnProperty('sentences')){
                payload.module = sender;
                this.modules.push(payload);
            }
        }
    },

    socketNotificationReceived: function(notification, payload){
        if(notification === 'READY'){
            this.icon = "fa-microphone";
            this.mode = this.translate("NO_MODE");
            this.pulsing = false;
            this.updateDom(300);
        } else if(notification === 'LISTENING'){
            this.pulsing = true;
            this.updateDom(300);
        } else if(notification === 'SLEEPING'){
            this.pulsing = false;
            this.updateDom(300);
        } else if(notification === 'ERROR'){
            this.mode = notification;
            this.updateDom(300);
        } else if(notification === 'VOICE'){
            for(var i = 0; i < this.modules.length; i++){
                if(payload.mode === this.modules[i].mode){
                    this.mode = payload.mode;
                    if(this.mode !== 'voice'){
                        this.sendNotification(notification + '_' + payload.mode, payload.sentence);
                    }
                    this.updateDom(300);
                    return;
                }
            }
        } else if(notification === 'HIDE'){
            MM.getModules().enumerate((module) => {
                module.hide(1000);
            });
        } else if(notification === 'SHOW'){
            MM.getModules().enumerate((module) => {
                module.show(1000);
            });
        } else if(notification === 'RENDER_HELP'){
            this.help = true;
            this.updateDom(300);
        } else if(notification === 'REMOVE_HELP'){
            this.help = false;
            this.updateDom(300);
        } else if(notification === 'DEBUG'){
            this.debugInformation = payload;
            this.updateDom();
        }
    }
});