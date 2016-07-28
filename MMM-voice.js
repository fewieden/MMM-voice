Module.register("MMM-voice",{
    // Default module config.
    defaults: {
        status: "Sleeping ... zZzZ",
        mode : "No mode detected",
        timeout: 15
    },

    // Override dom generator.
    getDom: function() {
        var wrapper = document.createElement("div");
        var status = document.createElement("p");
        status.innerHTML = this.config.status;
        var mode = document.createElement("p");
        mode.innerHTML = this.config.mode;
        wrapper.appendChild(mode);
        wrapper.appendChild(status);
        return wrapper;
    },

    notificationReceived: function(notification, payload, sender){
        if(notification == 'DOM_OBJECTS_CREATED'){
            this.sendSocketNotification('START', {'timeout': this.config.timeout, 'id': this.config.id});
        }
    },

    socketNotificationReceived: function(notification, payload){
        if(notification == 'LISTENING'){
            this.config.status = payload;
            this.updateDom();
        } else if (notification == 'MODE_CHANGED'){
            this.config.mode = payload;
            this.updateDom();
        } else if (notification == 'SPOTIFY'){
            Log.info('SPEECH_SPOTIFY: ' + payload);
            this.updateDom();
        } else if (notification == 'TRAIN'){
            Log.info('SPEECH_TRAIN: ' + payload);
            this.updateDom();
        } else if (notification == 'WEATHER'){
            Log.info('SPEECH_WEATHER: ' + payload);
            this.updateDom();
        } else if (notification == 'SOCCER'){
            this.sendNotification('SPEECH_SOCCER', payload);
            this.updateDom();
        }
    }
});
