const Psc = require('pocketsphinx-continuous');
const fs = require('fs');
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    start: function(){
        this.keyword = /(MAGIC MIRROR)/g;
        this.listening = false;
        this.mode = '';
    },

    socketNotificationReceived: function(notification, payload){
        if(notification == 'START'){
            this.modes = [];
            for(var i = 0; i < payload.modules.length; i++){
                this.modes.push({'key': payload.modules[i].mode, 'regex': new RegExp(payload.modules[i].mode, 'g')});
            }

            this.time = payload.timeout*1000;
            this.ps = new Psc({
                setId: payload.id,
                verbose: true
            });
            this.ps.on('data', (data) => {
                if(typeof data == 'string'){
                    fs.appendFile('data.log', data);
                    if(this.keyword.test(data) || this.listening){
                        console.log('LISTENING');
                        this.listening = true;
                        this.sendSocketNotification('LISTENING', 'Listening...');
                        if(this.timer){
                            clearTimeout(this.timer);
                        }
                        this.timer = setTimeout(() => {
                            this.listening = false;
                            this.sendSocketNotification('SLEEPING', 'Sleeping ... zZzZ');
                        }, this.time);
                    } else {
                        console.log('No KEYWORD DETECTED');
                        return;
                    }

                    for(var i = 0; i < this.modes.length; i++){
                        if(this.modes[i].regex.test(data)){
                            this.mode = this.modes[i].key;
                            this.sendSocketNotification(this.mode, data);
                            return;
                        }
                    }

                    if(this.mode){
                        this.sendSocketNotification(this.mode, data);
                    }
                }
            });
            this.ps.on('error', (error) => {
                fs.appendFile('error.log', error);
                this.sendSocketNotification('ERROR', error);
            });
            this.ps.on('debug', (data) => {
                fs.appendFile('debug.log', data);
                this.sendSocketNotification('DEBUG', data);
            });
        }
    }
});