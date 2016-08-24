/* Magic Mirror
 * Module: MMM-voice
 *
 * By fewieden https://github.com/fewieden/MMM-voice
 * MIT Licensed.
 */

const Psc = require('pocketsphinx-continuous');
const fs = require('fs');
const child = require('child_process');
const compare = require('file-compare').compare;
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    listening: false,
    mode: false,
    modes: [],
    modules: [],

    socketNotificationReceived: function(notification, payload){
        if(notification === 'START'){
            this.config = payload.config;
            this.keyword = new RegExp(this.config.keyword, 'g');
            this.modules = payload.modules;

            for(var i = 0; i < this.modules.length; i++){
                this.modes.push({'key': this.modules[i].mode, 'regex': new RegExp(this.modules[i].mode, 'g')});
            }

            this.createFiles();
        }
    },

    createFiles: function(){
        console.log('MMM-voice: creating files');
        var words = this.config.keyword.split(' ').join('\n') + '\n';
        var sentences = '<s> ' + this.config.keyword + ' </s>\n';
        for(var i = 0; i < this.modules.length; i++){
            words += this.modules[i].mode + '\n';
            sentences += '<s> ' + this.modules[i].mode + ' </s>\n';
            for(var n = 0; n < this.modules[i].sentences.length; n++){
                words += this.modules[i].sentences[n].split(' ').join('\n') + '\n';
                sentences += '<s> ' + this.modules[i].sentences[n] + ' </s>\n';
            }
        }
        fs.writeFile('modules/MMM-voice/words_temp.txt', words);
        fs.writeFile('modules/MMM-voice/sentences_temp.txt', sentences);
        this.checkFiles();
    },

    checkFiles: function(){
        console.log('MMM-voice: checking files');
        compare('modules/MMM-voice/words.txt', 'modules/MMM-voice/words_temp.txt', (result, error) => {
            if(result){
                compare('modules/MMM-voice/sentences.txt', 'modules/MMM-voice/sentences_temp.txt', (result, error) => {
                    if(result){
                        this.startPocketsphinx();
                    } else {
                        this.generateDicLM();
            }
            });
            } else {
                this.generateDicLM();
    }
    });
    },

    generateDicLM: function(){
        console.log('MMM-voice: generating .dic and .lm');
        child.exec('mv modules/MMM-voice/words_temp.txt modules/MMM-voice/words.txt && mv modules/MMM-voice/sentences_temp.txt modules/MMM-voice/sentences.txt',
            (error, stdout, stderr) => {
            if(!error){
            child.exec('g2p-seq2seq --decode modules/MMM-voice/words.txt --model modules/MMM-voice/model | tail -n +3 > modules/MMM-voice/MMM-voice.dic ' +
                '&& text2wfreq < modules/MMM-voice/sentences.txt | wfreq2vocab > modules/MMM-voice/MMM-voice.vocab ' +
                '&& text2idngram -vocab modules/MMM-voice/MMM-voice.vocab -idngram modules/MMM-voice/MMM-voice.idngram < modules/MMM-voice/sentences.txt ' +
                '&& idngram2lm -vocab_type 0 -idngram modules/MMM-voice/MMM-voice.idngram -vocab modules/MMM-voice/MMM-voice.vocab -arpa modules/MMM-voice/MMM-voice.lm',
                (error, stdout, stderr) => {
                if(!error){
                this.startPocketsphinx();
            } else {
                this.sendSocketNotification('ERROR', "Couldn't create necessary files!");
            }
        }
        );
        } else {
            this.sendSocketNotification('ERROR', "Couldn't create necessary files!");
        }
    }
        );
    },

    startPocketsphinx: function(){
        console.log('MMM-voice: starting pocketsphinx');
        this.time = this.config.timeout * 1000;
        this.ps = new Psc({
            setId: 'MMM-voice',
            verbose: true,
            microphone: this.config.microphone
        });
        this.ps.on('data', (data) => {
            if(typeof data == 'string'){
            if(this.keyword.test(data) || this.listening){
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
            if(error){
                fs.appendFile('modules/MMM-voice/error.log', error);
                this.sendSocketNotification('ERROR', error);
            }
        });
        this.sendSocketNotification("READY");
    }
});