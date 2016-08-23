/* Magic Mirror
 * Module: MMM-voice
 *
 * By fewieden https://github.com/fewieden/MMM-voice
 * MIT Licensed.
 */

Module.register("MMM-voice",{

    icon: "fa-microphone-slash",
    pulsing: false,
    modules: [],

    defaults: {
        timeout: 15
    },

    start: function(){
        this.mode = this.translate("INIT");
        Log.log(this.name + ' is started!');
        Log.info(this.name + ' is waiting for voice modules');
    },

    getStyles: function() {
        return ["font-awesome.css", "MMM-voice.css"];
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.classList.add('small', 'align-left');
        var i = document.createElement("i");
        i.classList.add('fa', this.icon);
        if(this.pulsing){
            i.classList.add('pulse');
        }
        var modeSpan = document.createElement("span");
        modeSpan.innerHTML = this.mode;
        wrapper.appendChild(i);
        wrapper.appendChild(modeSpan);
        return wrapper;
    },

    notificationReceived: function(notification, payload, sender){
        if(notification === 'DOM_OBJECTS_CREATED'){
            this.sendSocketNotification('START', {'config': this.config, 'modules': this.modules});
        } else if(notification === 'REGISTER_VOICE_MODULE'){
            if(payload.hasOwnProperty('mode')){
                this.modules.push(payload);
            }
        }
    },

    socketNotificationReceived: function(notification, payload){
        if(notification === 'READY'){
            this.icon = "fa-microphone";
            this.mode = this.translate("NO_MODE");
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
                    this.sendNotification(notification + '_' + payload.mode, payload.words);
                    this.updateDom(300);
                    return;
                }
            }
        }
    }
});