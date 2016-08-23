/* Magic Mirror
 * Module: MMM-voice
 *
 * By fewieden https://github.com/fewieden/MMM-voice
 * MIT Licensed.
 */

const Psc = require('pocketsphinx-continuous');
const fs = require('fs');
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    keyword: /(MAGIC MIRROR)/g,
    listening: false,
    mode: false,
    modes: [],

    socketNotificationReceived: function(notification, payload){
        if(notification === 'START'){
            this.config = payload.config;
            this.config.keyword = new RegExp(this.config.keyword, 'g') || this.keyword;
            for(var i = 0; i < payload.modules.length; i++){
                this.modes.push({'key': payload.modules[i].mode, 'regex': new RegExp(payload.modules[i].mode, 'g')});
            }

            this.time = this.config.timeout * 1000;
            this.ps = new Psc({
                setId: 'MMM-voice',
                verbose: true,
                microphone: this.config.microphone
            });
            this.sendSocketNotification("READY");
            this.ps.on('data', (data) => {
                if(typeof data == 'string'){
                    if(this.config.keyword.test(data) || this.listening){
                        console.log('LISTENING');
                        this.listening = true;
                        this.sendSocketNotification('LISTENING');
                        if(this.timer){
                            clearTimeout(this.timer);
                        }
                        this.timer = setTimeout(() => {
                            this.listening = false;
                            this.sendSocketNotification('SLEEPING');
                        }, this.time);
                    } else {
                        console.log('No KEYWORD DETECTED');
                        return;
                    }

                    for(var i = 0; i < this.modes.length; i++){
                        if(this.modes[i].regex.test(data)){
                            this.mode = this.modes[i].key;
                            this.sendSocketNotification('VOICE', {'mode': this.mode, 'words': data});
                            return;
                        }
                    }

                    if(this.mode){
                        this.sendSocketNotification('VOICE', {'mode': this.mode, 'words': data});
                    }
                }
            });
            this.ps.on('error', (error) => {
                fs.appendFile('modules/MMM-voice/error.log', error);
                this.sendSocketNotification('ERROR', error);
            });
        }
    }
});